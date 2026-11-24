<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Disbursement;
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
        $pending = Debt::withPaid()->where('status', 'pending')->with('user:id,name,email')->oldest()->get()
            ->map(fn (Debt $d) => [...$d->toArray(), 'owner' => $d->user?->only('name', 'email'), 'has_bill' => (bool) $d->bill_path]);

        // Money collected but not yet sent to the creditor.
        $toDisburse = Debt::withPaid()->public()->oldest()->get()
            ->filter(fn (Debt $d) => $d->paid > $d->disbursed)
            ->values();

        $pendingCompanies = \App\Models\User::companies()->where('company_verified', false)->oldest()->get()
            ->map(fn ($u) => [...$u->toPublic(), 'email' => $u->email, 'phone' => $u->phone]);

        return Inertia::render('admin/index', [
            'pending' => $pending,
            'toDisburse' => $toDisburse,
            'pendingCompanies' => $pendingCompanies,
        ]);
    }

    public function verifyCompany(\App\Models\User $user): \Illuminate\Http\RedirectResponse
    {
        abort_unless($user->is_company, 404);
        $user->update(['company_verified' => true]);

        return back();
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

        return back();
    }

    public function disburse(Request $request, Debt $debt): RedirectResponse
    {
        $request->merge(['amount' => (int) preg_replace('/\D/', '', (string) $request->input('amount'))]);
        $available = $debt->paid - $debt->disbursed;

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1', "max:$available"],
            'reference' => ['required', 'string', 'max:100'],
            'receipt' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $debt->disbursements()->create([
            'user_id' => $request->user()->id,
            'code' => Disbursement::newCode(),
            'amount' => $data['amount'],
            'reference' => $data['reference'],
            'receipt_path' => $request->file('receipt')->store('receipts'),
            'paid_at' => now(),
        ]);

        return back();
    }
}
