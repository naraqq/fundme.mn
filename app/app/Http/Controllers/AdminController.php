<?php

namespace App\Http\Controllers;

use App\Models\AdminAction;
use App\Models\Debt;
use App\Models\Disbursement;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    public function index(): Response
    {
        $owner = 'user:id,name,email,phone,created_at';

        // Most people sign up by phone, so admins need the phone to reach them (admin-only data).
        $pending = Debt::withPaid()->where('status', 'pending')->with($owner)->oldest()->get()
            ->map(fn (Debt $d) => $this->card($d));

        // Money collected but not yet sent to the requester. Paused requests are handled under Reports.
        $toDisburse = Debt::withPaid()->public()->with($owner)->oldest()->get()
            ->filter(fn (Debt $d) => $d->paid > $d->disbursed)
            ->map(fn (Debt $d) => $this->card($d))
            ->values();

        // Requests people reported, or that reports have paused.
        $reported = Debt::withPaid()->where('status', 'verified')
            ->where(fn ($q) => $q->whereNotNull('flagged_at')->orWhereHas('reports', fn ($r) => $r->open()))
            ->with([$owner, 'reports' => fn ($r) => $r->open()->with('user:id,name')->latest()])
            ->orderByDesc('flagged_at')->get()
            ->map(fn (Debt $d) => [
                ...$this->card($d),
                'reports' => $d->reports->map(fn (Report $r) => [
                    'id' => $r->id, 'reason' => $r->reason, 'details' => $r->details,
                    'by' => $r->user?->only('id', 'name'), 'at' => $r->created_at->toIso8601String(),
                ]),
            ]);

        $pendingCompanies = User::companies()->where('company_verified', false)->oldest()->get()
            ->map(fn ($u) => [...$u->toPublic(), 'email' => $u->email, 'phone' => $u->phone]);

        $history = AdminAction::with(['admin:id,name', 'debt:id,name,title', 'subject:id,name'])->latest('id')->take(100)->get()
            ->map(fn (AdminAction $a) => [
                'id' => $a->id, 'action' => $a->action, 'at' => $a->created_at->toIso8601String(),
                'admin' => $a->admin?->name, 'debt' => $a->debt?->only('id', 'name', 'title'),
                'subject' => $a->subject?->name, 'details' => $a->details,
            ]);

        return Inertia::render('admin/index', [
            'pending' => $pending,
            'toDisburse' => $toDisburse,
            'reported' => $reported,
            'pendingCompanies' => $pendingCompanies,
            'history' => $history,
        ]);
    }

    /** Everything an admin needs to judge a request: contact, payout account and risk warnings. */
    private function card(Debt $d): array
    {
        return [
            ...$d->toArray(),
            'owner' => $d->user?->only('id', 'name', 'email', 'phone'),
            'has_bill' => (bool) $d->bill_path,
            'payout' => $d->payoutAccount(),
            'risks' => $this->risks($d),
        ];
    }

    /**
     * Warning signs, worst first. Each is [code, details] so the UI can explain it.
     *
     * @return list<array{0: string, 1: array}>
     */
    private function risks(Debt $d): array
    {
        $risks = [];

        // The same bank account on someone else's request is the strongest scam signal.
        if ($d->bank_account_hash) {
            $others = Debt::where('bank_account_hash', $d->bank_account_hash)
                ->where('id', '!=', $d->id)
                ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', '!=', $d->user_id))
                ->get(['id', 'name', 'title', 'status']);
            if ($others->isNotEmpty()) {
                $risks[] = ['shared_account', ['requests' => $others->map->only('id', 'name', 'title', 'status')->values()]];
            }
        }

        $openReports = $d->relationLoaded('reports') ? $d->reports->count() : $d->reports()->open()->count();
        if ($openReports > 0) {
            $risks[] = ['reports', ['n' => $openReports]];
        }

        if ($d->account_holder && ! $this->namesMatch($d->account_holder, [$d->name, $d->user?->name])) {
            $risks[] = ['holder_mismatch', ['holder' => $d->account_holder]];
        }

        if ($d->user && $d->user->created_at?->gt(now()->subDays(config('fraud.new_account_days')))) {
            $risks[] = ['new_account', ['days' => (int) $d->user->created_at->diffInDays(now())]];
        }

        if ($d->user_id) {
            $rejected = Debt::where('user_id', $d->user_id)->where('id', '!=', $d->id)->where('status', 'rejected')->count();
            if ($rejected > 0) {
                $risks[] = ['rejected_before', ['n' => $rejected]];
            }
        }

        return $risks;
    }

    /** Does the account holder share a name with the requester? Ignores case and initials like "Б.". */
    private function namesMatch(string $holder, array $names): bool
    {
        $tokens = fn (?string $s) => collect(preg_split('/[^\p{L}]+/u', mb_strtolower((string) $s)))
            ->filter(fn ($t) => mb_strlen($t) >= 3)->values();

        return $tokens($holder)->intersect($names ? collect($names)->flatMap($tokens) : collect())->isNotEmpty();
    }

    public function verifyCompany(User $user): RedirectResponse
    {
        abort_unless($user->is_company, 404);
        $user->update(['company_verified' => true]);
        AdminAction::log('company_verified', subject: $user);

        return back()->with('toast', $this->toast('toast.companyVerified', ['name' => $user->name]));
    }

    public function bill(Debt $debt): StreamedResponse
    {
        abort_unless($debt->bill_path && Storage::exists($debt->bill_path), 404);

        return Storage::response($debt->bill_path);
    }

    public function review(Request $request, Debt $debt): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:verified,rejected'],
            'note' => ['required', 'string', 'max:300'],
        ]);

        $debt->update([
            'status' => $data['decision'],
            'verification_note' => $data['note'],
            'verified_at' => $data['decision'] === 'verified' ? now() : null,
        ]);
        if ($data['decision'] === 'rejected') {
            $debt->reports()->open()->update(['resolved_at' => now()]);
        }
        AdminAction::log($data['decision'] === 'verified' ? 'approved' : 'rejected', $debt, details: ['note' => $data['note']]);

        return back()->with('toast', $data['decision'] === 'verified'
            ? $this->toast('toast.reviewApproved', ['name' => $debt->name])
            : $this->toast('toast.reviewRejected', ['name' => $debt->name], 'info'));
    }

    /** Reports checked and unfounded: close them and un-pause the request. */
    public function dismissReports(Request $request, Debt $debt): RedirectResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'max:300']]);

        $n = $debt->reports()->open()->update(['resolved_at' => now()]);
        $debt->forceFill(['flagged_at' => null])->save();
        AdminAction::log('reports_dismissed', $debt, details: ['reports' => $n, 'note' => $data['note']]);

        return back()->with('toast', $this->toast('toast.reportsDismissed', ['name' => $debt->name]));
    }

    public function disburse(Request $request, Debt $debt): RedirectResponse
    {
        if ($debt->paused) {
            return back()->withErrors(['amount' => __('This request is paused because of reports. Review it before paying out.')]);
        }

        $request->merge(['amount' => (int) preg_replace('/\D/', '', (string) $request->input('amount'))]);
        $available = $debt->paid - $debt->disbursed;

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', "max:$available"],
            'reference' => ['required', 'string', 'max:100'],
            'receipt' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $payout = $debt->disbursements()->create([
            'user_id' => $request->user()->id,
            'code' => Disbursement::newCode(),
            'amount' => $data['amount'],
            'reference' => $data['reference'],
            'receipt_path' => $request->file('receipt')->store('receipts'),
            'paid_at' => now(),
        ]);
        AdminAction::log('paid_out', $debt, details: [
            'amount' => (int) $data['amount'], 'code' => $payout->code, 'reference' => $data['reference'],
            'to' => $debt->payoutAccount() ? $debt->bank_name.' ···'.substr($debt->bank_account, -4) : null,
        ]);

        return back()->with('toast', $this->toast('toast.disbursed', ['amount' => (int) $data['amount'], 'name' => $debt->name]));
    }
}
