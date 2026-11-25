<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('settings/profile');
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $user->fill(collect($request->validated())->except('logo', 'website')->all());

        if ($user->is_company) {
            $user->website = $request->input('website');
            if ($request->hasFile('logo')) {
                if ($user->logo_path) {
                    Storage::disk('public')->delete($user->logo_path);
                }
                $user->logo_path = $request->file('logo')->store('logos', 'public');
            }
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return to_route('profile.edit')->with('toast', $this->toast('toast.profileSaved'));
    }

    /**
     * Delete the account. Most users log in by phone and have no password, so we ask for an explicit
     * confirmation instead. Money records stay (requests, donations and payouts),
     * but the person's past donations become anonymous so their name no longer appears publicly.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['confirm' => ['accepted']]);

        $user = $request->user();

        // Log out *before* deleting: logout saves the remember-token, which would re-insert a deleted user.
        Auth::logout();

        DB::transaction(function () use ($user) {
            Payment::withUnconfirmed()->where('user_id', $user->id)->update(['anonymous' => true, 'payer_name' => 'Anonymous']);
            if ($user->logo_path) {
                Storage::disk('public')->delete($user->logo_path);
            }
            $user->delete();
        });

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('toast', $this->toast('toast.accountDeleted', type: 'info'));
    }
}
