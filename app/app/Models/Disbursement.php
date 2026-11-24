<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Disbursement extends Model
{
    protected $fillable = ['debt_id', 'user_id', 'code', 'amount', 'reference', 'receipt_path', 'paid_at'];

    protected $casts = ['amount' => 'integer', 'paid_at' => 'datetime'];

    protected $hidden = ['user_id', 'receipt_path'];

    protected $appends = ['has_receipt'];

    public static function newCode(): string
    {
        do {
            // No 0/O/1/I so codes are easy to read aloud and type.
            $code = 'FM-'.collect(range(1, 8))->map(fn () => Str::of('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')->charAt(random_int(0, 31)))->implode('');
        } while (static::where('code', $code)->exists());

        return $code;
    }

    public function debt(): BelongsTo
    {
        return $this->belongsTo(Debt::class);
    }

    public function getHasReceiptAttribute(): bool
    {
        return (bool) $this->receipt_path;
    }
}
