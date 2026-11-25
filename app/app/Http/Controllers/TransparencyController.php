<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Disbursement;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransparencyController extends Controller
{
    /** Platform-wide ledger: every tugrik in, every tugrik out. */
    public function index(): Response
    {
        $publicIds = Debt::public()->pluck('id');
        $collected = (int) Payment::whereIn('debt_id', $publicIds)->sum('amount');
        $sent = (int) Disbursement::sum('amount');

        $payments = Payment::with('debt:id,name')->whereIn('debt_id', $publicIds)->latest()->take(30)->get()
            ->map(fn (Payment $p) => [
                'type' => 'in', 'id' => $p->id, 'at' => $p->created_at, 'amount' => $p->amount,
                'who' => $p->anonymous ? null : $p->payer_name, 'debt' => $p->debt?->only('id', 'name'),
            ]);
        $disbursements = Disbursement::with('debt:id,name')->latest('paid_at')->take(30)->get()
            ->map(fn (Disbursement $d) => [
                'type' => 'out', 'id' => $d->id, 'at' => $d->paid_at, 'amount' => $d->amount,
                'code' => $d->code, 'debt' => $d->debt?->only('id', 'name'),
            ]);

        return Inertia::render('transparency', [
            'totals' => [
                'collected' => $collected,
                'sent' => $sent,
                'held' => $collected - $sent,
                'verified' => $publicIds->count(),
                'settled' => Debt::withPaid()->public()->get()->where('phase', 'settled')->count(),
                'patrons' => Payment::whereIn('debt_id', $publicIds)->distinct('user_id')->count('user_id'),
                ...User::growth(),
            ],
            'ledger' => $payments->concat($disbursements)->sortByDesc('at')->take(30)->values(),
        ]);
    }

    /** Anyone can confirm a payout by its code. */
    public function verify(Request $request): Response
    {
        $code = strtoupper(trim((string) $request->query('code', '')));
        $found = $code ? Disbursement::with('debt:id,name,title')->where('code', $code)->first() : null;

        return Inertia::render('verify', [
            'code' => $code,
            'result' => $found ? [
                ...$found->only('code', 'amount', 'reference', 'paid_at', 'has_receipt'),
                'debt' => $found->debt?->only('id', 'name', 'title'),
            ] : null,
        ]);
    }

    public function receipt(Disbursement $disbursement): StreamedResponse
    {
        abort_unless($disbursement->receipt_path && Storage::exists($disbursement->receipt_path), 404);

        return Storage::response($disbursement->receipt_path);
    }
}
