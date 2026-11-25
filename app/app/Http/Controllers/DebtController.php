<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DebtController extends Controller
{
    public function home(): Response
    {
        $debts = Debt::withPaid()->public()->get();

        return Inertia::render('welcome', [
            'featured' => Debt::withPaid()->open()->where('amount', '>', Debt::SMALL_MAX)->latest()->take(6)->get(),
            'small' => Debt::withPaid()->open()->where('amount', '<=', Debt::SMALL_MAX)->get()->sortBy('remaining')->values()->take(8),
            'stats' => [
                'paid' => (int) $debts->sum('paid'),
                'posted' => $debts->count(),
                'cleared' => $debts->where('phase', 'settled')->count(),
                'sent' => (int) $debts->sum('disbursed'),
                ...User::growth(),
            ],
            'categories' => $debts->countBy('category'),
            'topDonors' => Payment::leaderboard(5, companies: false),
            'topCompanies' => Payment::leaderboard(6, companies: true),
        ]);
    }

    public function index(Request $request): Response
    {
        $cat = in_array($request->query('cat'), Debt::CATEGORIES, true) ? $request->query('cat') : null;
        $sort = in_array($request->query('sort'), ['new', 'small', 'close'], true) ? $request->query('sort') : 'new';
        $smallOnly = $request->boolean('small');

        $debts = Debt::withPaid()->public()
            ->when($cat, fn ($q) => $q->where('category', $cat))
            ->when($smallOnly, fn ($q) => $q->where('amount', '<=', Debt::SMALL_MAX))
            ->latest()
            ->get();

        $debts = match ($sort) {
            'small' => $debts->sortBy('remaining')->values(),
            'close' => $debts->sortByDesc(fn ($d) => $d->paid / max(1, $d->amount))->values(),
            default => $debts,
        };

        return Inertia::render('debts/index', [
            'debts' => $debts,
            'filters' => ['cat' => $cat, 'sort' => $sort, 'small' => $smallOnly],
        ]);
    }

    /**
     * "Needs help most" first: least funded, then oldest. Old posts never sink
     * below new ones the way they do in a social feed.
     */
    public function discover(Request $request): Response
    {
        $cat = in_array($request->query('cat'), Debt::CATEGORIES, true) ? $request->query('cat') : null;

        // Least-funded first so the people who need help most surface, oldest breaking ties.
        $all = Debt::withPaid()->open()->oldest()->get()->sortBy(fn ($d) => $d->paid / max(1, $d->amount))->values();

        return Inertia::render('debts/discover', [
            'debts' => $cat ? $all->where('category', $cat)->values() : $all,
            'cat' => $cat,
            'categories' => $all->countBy('category'),
            'total' => $all->count(),
        ]);
    }

    public function show(Request $request, Debt $debt): Response
    {
        abort_unless($debt->isVisibleTo($request->user()), 404);

        $debt->loadSum('payments as paid_sum', 'amount')
            ->loadSum('disbursements as disbursed_sum', 'amount')
            ->loadCount('payments')
            ->load(['payments', 'disbursements']);

        return Inertia::render('debts/show', [
            'debt' => $debt,
            'isOwner' => $request->user()?->id === $debt->user_id,
            // Fetched separately so the owner's phone/email never get serialized with the debt.
            'owner' => $debt->user()->first(['id', 'name'])?->only('id', 'name'),
            'shareUrl' => route('debts.show', $debt),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('debts/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge(['amount' => (int) preg_replace('/\D/', '', (string) $request->input('amount'))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'age' => ['nullable', 'integer', 'min:16', 'max:120'],
            'city' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:70'],
            'story' => ['required', 'string', 'min:40', 'max:3000'],
            'category' => ['required', Rule::in(Debt::CATEGORIES)],
            'creditor' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'integer', 'min:5000', 'max:500000000'],
            'bill' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ], [
            'amount.min' => __('Amount must be at least ₮5,000.'),
            'story.min' => __('Tell a bit more of your story (40+ characters).'),
            'bill.required' => __('Upload your bill or contract so we can verify it.'),
        ]);

        $debt = $request->user()->debts()->create([
            ...collect($data)->except('bill', 'photo')->all(),
            'photo_path' => $request->file('photo')?->store('photos', 'public'),
            'bill_path' => $request->file('bill')->store('bills'), // private disk
            'status' => 'pending',
            'color' => Debt::COLORS[array_rand(Debt::COLORS)],
        ]);

        return to_route('debts.show', $debt)->with('toast', $this->toast('toast.posted', description: 'toast.postedSub'));
    }

    public function pay(Request $request, Debt $debt): RedirectResponse
    {
        $request->merge(['amount' => (int) preg_replace('/\D/', '', (string) $request->input('amount'))]);

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:1000'],
            'anonymous' => ['boolean'],
            'message' => ['nullable', 'string', 'max:140'],
        ], ['amount.min' => __('Minimum payment is ₮1,000.')]);

        if ($debt->status !== 'verified') {
            return back()->withErrors(['amount' => __('This debt has not been verified yet.')]);
        }
        if ($request->user()->id === $debt->user_id) {
            return back()->withErrors(['amount' => __("You can't pay your own debt here.")]);
        }

        $anonymous = (bool) ($data['anonymous'] ?? false);

        // Lock the debt row so two patrons paying at once can't overshoot the total.
        $amount = DB::transaction(function () use ($debt, $data, $anonymous, $request) {
            Debt::whereKey($debt->id)->lockForUpdate()->first();
            $remaining = max(0, $debt->amount - (int) $debt->payments()->sum('amount'));
            if ($remaining <= 0) {
                return 0;
            }

            $amount = min($data['amount'], $remaining);

            // TODO: real payment — charge the patron (QPay / card) into the escrow account.
            $debt->payments()->create([
                'user_id' => $request->user()->id,
                'payer_name' => $anonymous ? 'Anonymous' : $request->user()->name,
                'anonymous' => $anonymous,
                'amount' => $amount,
                'message' => $data['message'] ?? null,
            ]);

            return $amount;
        });

        if ($amount === 0) {
            return back()->withErrors(['amount' => __('This debt is already fully paid 🎉')]);
        }

        $cleared = $debt->amount - (int) $debt->payments()->sum('amount') <= 0;

        return back()->with('toast', $this->toast(
            'toast.paid',
            ['amount' => $amount, 'name' => $debt->name],
            description: $cleared ? 'toast.paidCleared' : 'toast.paidSub',
        ));
    }

    public function dashboard(Request $request): Response
    {
        $user = $request->user();
        $myPayments = $user->payments()->with('debt:id,name,title')->latest()->get();
        $myDebts = $user->debts()->withPaid()->latest()->get();

        return Inertia::render('dashboard', [
            'me' => [
                'id' => $user->id,
                'name' => $user->name,
                'is_company' => (bool) $user->is_company,
                'company_verified' => (bool) $user->company_verified,
                'logo_url' => $user->logo_url,
                'is_admin' => (bool) $user->is_admin,
            ],
            'stats' => [
                'given' => (int) $myPayments->sum('amount'),
                'helped' => $myPayments->pluck('debt_id')->unique()->count(),
                'requests' => $myDebts->count(),
                'followers' => $user->followers()->count(),
                'following' => $user->following()->count(),
            ],
            'myDebts' => $myDebts,
            // Shaped so the partially-loaded debt isn't serialized with its computed appends.
            'myPayments' => $myPayments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'debt' => $p->debt?->only('id', 'name', 'title'),
            ]),
            ...UserProfileController::feedFor($user),
        ]);
    }
}
