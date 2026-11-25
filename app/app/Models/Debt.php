<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Debt extends Model
{
    public const CATEGORIES = ['loan', 'medical', 'tuition', 'rent', 'utility', 'phone', 'food', 'transport', 'other'];

    /** Everyday bills a single patron can clear in one tap. */
    public const SMALL_MAX = 100_000;

    public const COLORS = ['amber', 'rose', 'sky', 'emerald', 'violet', 'orange'];

    protected $fillable = [
        'name', 'age', 'city', 'title', 'story', 'category', 'creditor', 'amount', 'color',
        'photo_path', 'photo_credit', 'photo_credit_url', 'bill_path', 'status', 'verified_at', 'verification_note',
    ];

    protected $casts = [
        'amount' => 'integer',
        'age' => 'integer',
        'verified_at' => 'datetime',
    ];

    protected $appends = ['paid', 'remaining', 'disbursed', 'phase', 'verified', 'photo_url'];

    protected $hidden = ['user_id', 'bill_path', 'photo_path', 'paid_sum', 'disbursed_sum'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest();
    }

    public function disbursements(): HasMany
    {
        return $this->hasMany(Disbursement::class)->latest('paid_at');
    }

    /** Preload totals so `paid` / `disbursed` don't run a query per row. */
    public function scopeWithPaid(Builder $q): Builder
    {
        return $q->withSum('payments as paid_sum', 'amount')
            ->withSum('disbursements as disbursed_sum', 'amount')
            ->withCount('payments');
    }

    /** Only reviewed debts are shown to the public or accept money. */
    public function scopePublic(Builder $q): Builder
    {
        return $q->where('status', 'verified');
    }

    public function scopeOpen(Builder $q): Builder
    {
        // Only confirmed payments count toward the total (pending QPay payments don't close a request).
        return $q->public()->whereRaw(
            'amount > (select coalesce(sum(amount), 0) from payments where payments.debt_id = debts.id and payments.status = ?)',
            [Payment::PAID],
        );
    }

    public function getPaidAttribute(): int
    {
        return (int) (array_key_exists('paid_sum', $this->attributes) ? $this->attributes['paid_sum'] : $this->payments()->sum('amount'));
    }

    public function getDisbursedAttribute(): int
    {
        return (int) (array_key_exists('disbursed_sum', $this->attributes) ? $this->attributes['disbursed_sum'] : $this->disbursements()->sum('amount'));
    }

    public function getRemainingAttribute(): int
    {
        return max(0, $this->amount - $this->paid);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? '/storage/'.$this->photo_path : null;
    }

    public function getVerifiedAttribute(): bool
    {
        return $this->status === 'verified';
    }

    /** pending → open → funded (all collected) → settled (all sent to creditor); or rejected. */
    public function getPhaseAttribute(): string
    {
        if ($this->status !== 'verified') {
            return $this->status ?? 'pending'; // null when loaded without the status column
        }
        if ($this->disbursed >= $this->amount) {
            return 'settled';
        }

        return $this->remaining === 0 ? 'funded' : 'open';
    }

    public function isVisibleTo(?User $user): bool
    {
        return $this->status === 'verified' || ($user && ($user->is_admin || $user->id === $this->user_id));
    }
}
