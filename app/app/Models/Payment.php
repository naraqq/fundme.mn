<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = ['debt_id', 'user_id', 'payer_name', 'anonymous', 'amount', 'message'];

    protected $casts = ['anonymous' => 'boolean', 'amount' => 'integer'];

    protected $hidden = ['user_id'];

    /** Profile link for named donations; null for anonymous ones so the donor stays private. */
    protected $appends = ['donor_id'];

    public function getDonorIdAttribute(): ?int
    {
        return $this->anonymous ? null : $this->user_id;
    }

    /** Named donations to verified requests — the only ones that count publicly. */
    public function scopePublicNamed(\Illuminate\Database\Eloquent\Builder $q): \Illuminate\Database\Eloquent\Builder
    {
        return $q->where('anonymous', false)->whereNotNull('user_id')
            ->whereHas('debt', fn ($d) => $d->where('status', 'verified'));
    }

    /**
     * Top donors by total named giving. Anonymous donations are excluded entirely.
     *
     * @return \Illuminate\Support\Collection<int, array{rank:int, user:array, total:int, helped:int, gifts:int, followers:int}>
     */
    public static function leaderboard(int $limit = 50, ?\DateTimeInterface $since = null, ?bool $companies = null): \Illuminate\Support\Collection
    {
        $rows = static::publicNamed()
            ->when($since, fn ($q) => $q->where('created_at', '>=', $since))
            ->when($companies !== null, fn ($q) => $q->whereHas('user', fn ($u) => $u->where('is_company', $companies)))
            ->selectRaw('user_id, sum(amount) as total, count(distinct debt_id) as helped, count(*) as gifts')
            ->groupBy('user_id')->orderByDesc('total')->limit($limit)->get();

        $users = User::withCount('followers')->whereIn('id', $rows->pluck('user_id'))->get()->keyBy('id');

        return $rows->values()->map(fn ($r, $i) => [
            'rank' => $i + 1,
            'user' => $users[$r->user_id]->toPublic(),
            'total' => (int) $r->total,
            'helped' => (int) $r->helped,
            'gifts' => (int) $r->gifts,
            'followers' => (int) $users[$r->user_id]->followers_count,
        ]);
    }

    public function debt(): BelongsTo
    {
        return $this->belongsTo(Debt::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
