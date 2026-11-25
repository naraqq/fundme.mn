<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A user's report that a request looks wrong (scam, fake story, …). */
class Report extends Model
{
    protected $fillable = ['debt_id', 'user_id', 'reason', 'details', 'resolved_at'];

    protected $casts = ['resolved_at' => 'datetime'];

    public function scopeOpen(Builder $q): Builder
    {
        return $q->whereNull('resolved_at');
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
