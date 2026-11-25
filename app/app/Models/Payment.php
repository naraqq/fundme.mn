<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    public const PENDING = 'pending';

    public const PAID = 'paid';

    public const FAILED = 'failed';

    protected $fillable = ['debt_id', 'user_id', 'payer_name', 'anonymous', 'amount', 'fee', 'status', 'paid_at', 'message'];

    protected $casts = ['anonymous' => 'boolean', 'amount' => 'integer', 'fee' => 'integer', 'paid_at' => 'datetime'];

    protected static function booted(): void
    {
        // Only confirmed money counts: totals, progress, leaderboards, transparency, payouts.
        // Code that must see pending/failed rows (a donor's own history, the QPay callback) uses withUnconfirmed().
        static::addGlobalScope('paid', fn (Builder $q) => $q->where('payments.status', self::PAID));

        static::creating(function (Payment $p) {
            $p->status ??= self::PAID;
            if ($p->status === self::PAID && ! $p->paid_at) {
                $p->paid_at = now();
            }
        });
    }

    public function scopeWithUnconfirmed(Builder $q): Builder
    {
        return $q->withoutGlobalScope('paid');
    }

    /**
     * Commission the donor pays on top of a donation, rounded up to a whole tugrik.
     * Mirrors feeFor() in resources/js/lib/zeel.ts — keep the two in sync.
     */
    public static function feeFor(int $amount): int
    {
        $basisPoints = (int) round(config('payments.fee_percent') * 100);

        return intdiv($amount * $basisPoints + 9_999, 10_000);
    }

    /**
     * Where each donation is, from the donor's point of view:
     * pending → collected (fundme.mn holds it) → sent (the creditor has it); or failed.
     * Transfers to the creditor are matched to donations oldest-first.
     *
     * @param  \Illuminate\Support\Collection<int, Payment>  $payments
     * @return array<int, string> payment id => stage
     */
    public static function stagesFor(\Illuminate\Support\Collection $payments): array
    {
        $debtIds = $payments->pluck('debt_id')->unique()->values();
        $sentTotal = Disbursement::whereIn('debt_id', $debtIds)->groupBy('debt_id')
            ->selectRaw('debt_id, sum(amount) as total')->pluck('total', 'debt_id');

        $sent = [];
        static::whereIn('debt_id', $debtIds)->orderBy('paid_at')->orderBy('id')->get(['id', 'debt_id', 'amount'])
            ->groupBy('debt_id')
            ->each(function ($rows, $debtId) use ($sentTotal, &$sent) {
                $budget = (int) ($sentTotal[$debtId] ?? 0);
                $running = 0;
                foreach ($rows as $row) {
                    $running += $row->amount;
                    if ($running <= $budget) {
                        $sent[$row->id] = true;
                    }
                }
            });

        return $payments->mapWithKeys(fn (Payment $p) => [$p->id => match (true) {
            $p->status === self::PENDING => 'pending',
            $p->status === self::FAILED => 'failed',
            isset($sent[$p->id]) => 'sent',
            default => 'collected',
        }])->all();
    }

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
