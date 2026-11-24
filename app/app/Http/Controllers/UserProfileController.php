<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserProfileController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        $viewer = $request->user();

        // Only named donations to verified requests are public.
        $donations = Payment::publicNamed()->where('user_id', $user->id)
            ->with('debt:id,name,title,category,color,photo_path,status')
            ->latest()->take(50)->get()
            ->map(fn (Payment $p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'message' => $p->message,
                'created_at' => $p->created_at->toIso8601String(),
                'debt' => $p->debt?->only('id', 'name', 'title', 'category', 'photo_url', 'color'),
            ]);

        $requests = $user->debts()->withPaid()->public()->latest()->get();

        $people = fn ($relation) => $relation->withCount('followers')->latest('follows.created_at')->take(100)->get()
            ->map(fn (User $u) => [...$u->toPublic(), 'followers' => $u->followers_count]);

        $named = Payment::publicNamed()->where('user_id', $user->id);

        return Inertia::render('profile/show', [
            'profile' => $user->toPublic(),
            'stats' => [
                'given' => (int) (clone $named)->sum('amount'),
                'helped' => (int) (clone $named)->distinct('debt_id')->count('debt_id'),
                'requests' => $requests->count(),
                'followers' => $user->followers()->count(),
                'following' => $user->following()->count(),
            ],
            'isMe' => $viewer?->id === $user->id,
            'isFollowing' => $viewer ? $viewer->isFollowing($user) : false,
            'donations' => $donations,
            'requests' => $requests,
            'followers' => $people($user->followers()),
            'followingList' => $people($user->following()),
        ]);
    }

    public function follow(Request $request, User $user): RedirectResponse
    {
        abort_if($request->user()->id === $user->id, 422, 'You cannot follow yourself.');
        $request->user()->following()->syncWithoutDetaching([$user->id]);

        return back();
    }

    public function unfollow(Request $request, User $user): RedirectResponse
    {
        $request->user()->following()->detach($user->id);

        return back();
    }

    public function companies(Request $request): Response
    {
        $period = $request->query('period') === 'month' ? 'month' : 'all';
        $board = Payment::leaderboard(50, $period === 'month' ? now()->startOfMonth() : null, companies: true);
        $viewer = $request->user();
        $followingIds = $viewer ? $viewer->following()->pluck('users.id') : collect();

        return Inertia::render('companies', [
            'period' => $period,
            'board' => $board->map(fn ($row) => [...$row, 'isFollowing' => $followingIds->contains($row['user']['id'])]),
            'totals' => [
                'companies' => User::companies()->whereHas('payments', fn ($q) => $q->where('anonymous', false))->count(),
                'given' => (int) Payment::publicNamed()->whereHas('user', fn ($u) => $u->where('is_company', true))->sum('amount'),
                ...User::growth(),
            ],
        ]);
    }

    public function donors(Request $request): Response
    {
        $period = $request->query('period') === 'month' ? 'month' : 'all';
        $board = Payment::leaderboard(50, $period === 'month' ? now()->startOfMonth() : null, companies: false);
        $viewer = $request->user();
        $followingIds = $viewer ? $viewer->following()->pluck('users.id') : collect();

        return Inertia::render('donors', [
            'period' => $period,
            'board' => $board->map(fn ($row) => [...$row, 'isFollowing' => $followingIds->contains($row['user']['id'])]),
            'totals' => [
                'donors' => Payment::publicNamed()->distinct('user_id')->count('user_id'),
                'given' => (int) Payment::publicNamed()->sum('amount'),
                ...User::growth(),
            ],
        ]);
    }

    /** Dashboard data: what the people I follow did lately + who to follow next. */
    public static function feedFor(User $user): array
    {
        $ids = $user->following()->pluck('users.id');

        $donated = Payment::publicNamed()->whereIn('user_id', $ids)
            ->with(['debt:id,name,title', 'user:id,name'])->latest()->take(20)->get()
            ->map(fn (Payment $p) => [
                'type' => 'donated', 'id' => "p{$p->id}", 'at' => $p->created_at->toIso8601String(),
                'who' => $p->user->toPublic(), 'amount' => $p->amount, 'debt' => $p->debt?->only('id', 'name', 'title'),
            ]);

        $posted = Debt::public()->whereIn('user_id', $ids)->with('user:id,name')->latest()->take(10)->get()
            ->map(fn (Debt $d) => [
                'type' => 'posted', 'id' => "d{$d->id}", 'at' => $d->created_at->toIso8601String(),
                'who' => $d->user->toPublic(), 'amount' => $d->amount, 'debt' => $d->only('id', 'name', 'title'),
            ]);

        $suggest = Payment::leaderboard(12)
            ->reject(fn ($row) => $row['user']['id'] === $user->id || $ids->contains($row['user']['id']))
            ->take(4)->values();

        return [
            'feed' => $donated->concat($posted)->sortByDesc('at')->take(20)->values(),
            'suggest' => $suggest,
        ];
    }
}
