<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\PhoneVerification;
use App\Models\User;
use App\Services\VerifyMn;
use App\Services\VerifyMnException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Phone-first login / sign-up via verify.mn:
 * start (create session) → user texts code to 144773 → we poll verify.mn → complete (log in or ask name).
 */
class PhoneLoginController extends Controller
{
    private const SESSION_KEY = 'phone_verification_id';

    private const VERIFIED_PHONE_KEY = 'verified_phone';

    public function create(Request $request): Response
    {
        return Inertia::render('auth/phone-login', [
            'verification' => $this->current($request)?->toClient(),
        ]);
    }

    public function start(Request $request): RedirectResponse
    {
        $request->validate(['phone' => ['required', 'string', 'max:20']]);

        $phone = VerifyMn::normalizePhone($request->input('phone'));
        if (! $phone) {
            return back()->withErrors(['phone' => __('Enter an 8-digit Mongolian mobile number.')]);
        }

        // DEV ONLY: numbers in VERIFY_MN_DEV_PHONES skip the SMS. Guarded by a non-production
        // environment, so this can never bypass verification on a live site.
        if (! app()->isProduction() && in_array($phone, config('services.verify_mn.dev_phones', []), true)) {
            $verification = PhoneVerification::create([
                'phone' => $phone,
                'code' => '000000',
                'status' => 'VERIFIED',
                'verified_at' => now(),
                'expires_at' => now()->addMinutes(5),
            ]);
            $request->session()->put(self::SESSION_KEY, $verification->id);

            return to_route('login');
        }

        // A new session always gets a new code; any earlier one in this browser is abandoned.
        $verification = PhoneVerification::create([
            'phone' => $phone,
            'code' => VerifyMn::newCode(),
            'status' => 'PENDING',
            'expires_at' => now()->addMinutes(5),
        ]);

        try {
            $session = app(VerifyMn::class)->createSession($phone, $verification->code, $this->callbackUrl($verification));
        } catch (VerifyMnException $e) {
            Log::error('verify.mn: could not create session', ['status' => $e->status, 'phone_last4' => substr($phone, -4)]);
            $verification->delete();

            return back()->withErrors(['phone' => __('Could not start phone verification. Please try again.')]);
        }

        $verification->update([
            'session_id' => $session['sessionId'],
            'sms_uri' => $session['smsUri'],
            'display_instruction' => $session['displayInstruction'],
            'expires_at' => Carbon::parse($session['expiresAt']),
        ]);

        $request->session()->put(self::SESSION_KEY, $verification->id);

        return to_route('login');
    }

    /** Polled by the login page every ~3s. We ask verify.mn server-side. */
    public function status(Request $request): JsonResponse
    {
        $verification = $this->current($request);
        abort_unless($verification, 404);

        return response()->json(['status' => $verification->refreshStatus()]);
    }

    public function complete(Request $request): RedirectResponse
    {
        $verification = $this->current($request);
        if (! $verification || $verification->refreshStatus() !== 'VERIFIED') {
            return to_route('login')->withErrors(['phone' => __('Your number is not verified yet.')]);
        }

        $verification->update(['consumed_at' => now()]);
        $request->session()->forget(self::SESSION_KEY);

        $user = User::where('phone', $verification->phone)->first();
        if ($user) {
            $user->forceFill(['phone_verified_at' => now()])->save();
            $verification->update(['user_id' => $user->id]);

            return $this->login($request, $user);
        }

        // New person: confirmed number, now just needs a name.
        $request->session()->put(self::VERIFIED_PHONE_KEY, ['phone' => $verification->phone, 'id' => $verification->id, 'at' => now()->timestamp]);

        return to_route('login.phone.name');
    }

    public function nameForm(Request $request): Response|RedirectResponse
    {
        $pending = $this->verifiedPhone($request);
        if (! $pending) {
            return to_route('login');
        }

        return Inertia::render('auth/phone-name', ['phone' => $pending['phone']]);
    }

    public function storeName(Request $request): RedirectResponse
    {
        $pending = $this->verifiedPhone($request);
        if (! $pending) {
            return to_route('login');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'is_company' => ['boolean'],
            'website' => ['nullable', 'string', 'max:100'],
        ]);
        $isCompany = (bool) ($data['is_company'] ?? false);

        $user = User::firstOrNew(['phone' => $pending['phone']]);
        $user->fill([
            'name' => $data['name'],
            'is_company' => $isCompany,
            'website' => $isCompany ? ($data['website'] ?? null) : null,
        ])->forceFill(['phone_verified_at' => now(), 'company_verified' => false])->save();
        PhoneVerification::whereKey($pending['id'])->update(['user_id' => $user->id]);
        $request->session()->forget(self::VERIFIED_PHONE_KEY);

        return $this->login($request, $user);
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->session()->forget(self::SESSION_KEY);

        return to_route('login');
    }

    /**
     * verify.mn's GET callback: a wake-up signal only (no body, no signature).
     * Answer 200 immediately; re-check the real status after the response is sent.
     */
    public function callback(PhoneVerification $verification): \Illuminate\Http\Response
    {
        dispatch(fn () => $verification->refreshStatus())->afterResponse();

        return response('', 200);
    }

    private function login(Request $request, User $user): RedirectResponse
    {
        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function current(Request $request): ?PhoneVerification
    {
        $id = $request->session()->get(self::SESSION_KEY);

        return $id ? PhoneVerification::whereKey($id)->whereNull('consumed_at')->first() : null;
    }

    /** @return array{phone: string, id: string, at: int}|null */
    private function verifiedPhone(Request $request): ?array
    {
        $pending = $request->session()->get(self::VERIFIED_PHONE_KEY);

        // The confirmed number is good for 15 minutes to finish sign-up.
        return $pending && now()->timestamp - $pending['at'] < 900 ? $pending : null;
    }

    private function callbackUrl(PhoneVerification $verification): ?string
    {
        $enabled = config('services.verify_mn.use_callback') && str_starts_with((string) config('app.url'), 'https://');

        return $enabled ? route('verify-mn.callback', $verification) : null;
    }
}
