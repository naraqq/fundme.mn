<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\AdminAction;
use App\Models\Payment;
use App\Models\Report;
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
            // Swipe right on the home page: the people who need help most.
            'deck' => self::neediest()->take(6)->values(),
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
        $search = mb_substr(trim((string) $request->query('q', '')), 0, 60);
        $openOnly = $request->boolean('open');

        // Everything except the category, so each category tab can show how many it would give.
        $matching = Debt::withPaid()->public()
            ->when($smallOnly, fn ($q) => $q->where('amount', '<=', Debt::SMALL_MAX))
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%{$search}%")
                ->orWhere('name', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('story', 'like', "%{$search}%")))
            ->latest()
            ->get()
            ->when($openOnly, fn ($c) => $c->filter(fn (Debt $d) => $d->remaining > 0));

        $debts = $matching->when($cat, fn ($c) => $c->where('category', $cat))->values();
        $debts = match ($sort) {
            'small' => $debts->sortBy('remaining')->values(),
            'close' => $debts->sortByDesc(fn ($d) => $d->paid / max(1, $d->amount))->values(),
            default => $debts,
        };

        return Inertia::render('debts/index', [
            'debts' => $debts,
            'counts' => $matching->countBy('category'),
            'total' => $matching->count(),
            'filters' => ['cat' => $cat, 'sort' => $sort, 'small' => $smallOnly, 'q' => $search, 'open' => $openOnly],
        ]);
    }

    /** Open requests, least-funded first so the people who need help most surface; oldest breaks ties. */
    private static function neediest(): \Illuminate\Support\Collection
    {
        return Debt::withPaid()->open()->oldest()->get()->sortBy(fn ($d) => $d->paid / max(1, $d->amount))->values();
    }

    /**
     * "Needs help most" first: least funded, then oldest. Old posts never sink
     * below new ones the way they do in a social feed.
     */
    public function discover(Request $request): Response
    {
        $cat = in_array($request->query('cat'), Debt::CATEGORIES, true) ? $request->query('cat') : null;

        $all = self::neediest();

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
            'reportReasons' => config('fraud.report_reasons'),
            'comments' => $this->commentsFor($debt, $request->user()),
            'reported' => $request->user() ? $debt->reports()->where('user_id', $request->user()->id)->exists() : false,
        ]);
    }

    /** Public comments, with "requester" / "donor" labels and whether the viewer may delete each one. */
    private function commentsFor(Debt $debt, ?User $viewer): array
    {
        $donorIds = $debt->payments()->whereNotNull('user_id')->pluck('user_id')->unique();

        return $debt->comments()->with('user:id,name,is_company,company_verified,logo_path')->take(200)->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'body' => $c->body,
                'at' => $c->created_at->toIso8601String(),
                'user' => $c->user ? [...$c->user->only('id', 'name', 'is_company', 'company_verified'), 'logo_url' => $c->user->logo_url] : null,
                'role' => $c->user_id === $debt->user_id ? 'owner' : ($donorIds->contains($c->user_id) ? 'donor' : null),
                'canDelete' => $viewer && ($viewer->id === $c->user_id || $viewer->is_admin),
            ])->all();
    }

    public function create(Request $request): Response
    {
        $active = Debt::activeFor($request->user());

        return Inertia::render('debts/create', [
            'banks' => config('payments.banks'),
            // One request at a time: show the current one instead of the form.
            'active' => $active?->only('id', 'title', 'phase'),
            'newAccountMax' => $this->isNewAccount($request->user()) ? config('fraud.new_account_max') : null,
        ]);
    }

    private function isNewAccount(User $user): bool
    {
        return $user->created_at?->gt(now()->subDays(config('fraud.new_account_days'))) ?? true;
    }

    /** Anyone signed in (except the owner) can report a request; enough reports pause it for an admin. */
    public function report(Request $request, Debt $debt): RedirectResponse
    {
        abort_unless($debt->status === 'verified', 404);
        abort_if($request->user()->id === $debt->user_id, 403);

        $data = $request->validate([
            'reason' => ['required', Rule::in(config('fraud.report_reasons'))],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        Report::updateOrCreate(
            ['debt_id' => $debt->id, 'user_id' => $request->user()->id],
            [...$data, 'resolved_at' => null],
        );

        $reporters = $debt->reports()->open()->distinct('user_id')->count('user_id');
        if (! $debt->paused && $reporters >= config('fraud.auto_pause_reports')) {
            $debt->forceFill(['flagged_at' => now()])->save();
            AdminAction::log('auto_paused', $debt, details: ['reports' => $reporters]);
        }

        return back()->with('toast', $this->toast('toast.reported', description: 'toast.reportedSub'));
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'amount' => (int) preg_replace('/\D/', '', (string) $request->input('amount')),
            'bank_account' => preg_replace('/[\s-]/', '', (string) $request->input('bank_account')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'age' => ['nullable', 'integer', 'min:16', 'max:120'],
            'city' => ['required', 'string', 'max:60'],
            'title' => ['required', 'string', 'max:70'],
            'story' => ['required', 'string', 'min:40', 'max:3000'],
            'category' => ['required', Rule::in(Debt::CATEGORIES)],
            'amount' => ['required', 'integer', 'min:5000', 'max:500000000'],
            // Where the collected donations are sent (admin-only). IBANs look like MN + 18 digits.
            'bank_name' => ['required', Rule::in(config('payments.banks'))],
            'bank_account' => ['required', 'regex:/^(MN\d{18}|\d{6,20})$/i'],
            'account_holder' => ['required', 'string', 'max:80'],
            // Optional supporting photo/document (contract, screenshot…), seen by admins only.
            'bill' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ], [
            'amount.min' => __('Amount must be at least ₮5,000.'),
            'story.min' => __('Tell a bit more of your story (40+ characters).'),
            'bank_account.regex' => __('Enter a valid account number (digits only, or an MN IBAN).'),
        ]);

        $user = $request->user();
        if (Debt::activeFor($user)) {
            return back()->withErrors(['active' => __('You already have an active request. You can post a new one after it is paid out or closed.')]);
        }
        if ($this->isNewAccount($user) && $data['amount'] > config('fraud.new_account_max')) {
            return back()->withErrors(['amount' => __('New accounts can ask for up to :amount at first.', ['amount' => '₮'.number_format(config('fraud.new_account_max'))])]);
        }

        $debt = $user->debts()->create([
            ...collect($data)->except('bill', 'photo')->all(),
            'bank_account' => strtoupper($data['bank_account']),
            'photo_path' => $request->file('photo')?->store('photos', 'public'),
            'bill_path' => $request->file('bill')?->store('bills'), // private disk
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
        if ($debt->paused) {
            return back()->withErrors(['amount' => __('This request is paused while we review reports about it.')]);
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

            // TODO(QPay): create this as Payment::PENDING with a QPay invoice for amount + fee, and mark it
            // PAID only after QPay confirms. Until then (demo mode) payments are confirmed instantly.
            $debt->payments()->create([
                'user_id' => $request->user()->id,
                'payer_name' => $anonymous ? 'Anonymous' : $request->user()->name,
                'anonymous' => $anonymous,
                'amount' => $amount,
                'fee' => Payment::feeFor($amount),
                'status' => Payment::PAID,
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
        // Includes pending/failed so donors can follow every payment they started.
        $myPayments = $user->payments()->withUnconfirmed()->with('debt:id,name,title')->latest()->orderByDesc('id')->get();
        $confirmed = $myPayments->where('status', Payment::PAID);
        $stages = Payment::stagesFor($myPayments);
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
                'given' => (int) $confirmed->sum('amount'),
                'helped' => $confirmed->pluck('debt_id')->unique()->count(),
                'requests' => $myDebts->count(),
                'followers' => $user->followers()->count(),
                'following' => $user->following()->count(),
            ],
            'myDebts' => $myDebts,
            // Shaped so the partially-loaded debt isn't serialized with its computed appends.
            'myPayments' => $myPayments->map(fn ($p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'fee' => $p->fee,
                'stage' => $stages[$p->id],
                'created_at' => $p->created_at->toIso8601String(),
                'debt' => $p->debt?->only('id', 'name', 'title'),
            ]),
            ...UserProfileController::feedFor($user),
        ]);
    }
}
