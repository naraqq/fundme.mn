<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A public comment on a request. */
class Comment extends Model
{
    protected $fillable = ['debt_id', 'user_id', 'body'];

    /**
     * Comments can't carry links or long numbers: otherwise anyone could post
     * "send money straight to my account 5000…" and route donations around fundme.mn.
     */
    public static function looksLikePaymentBait(string $body): bool
    {
        $link = '/(https?:\/\/|www\.|\b[\w-]+\.(com|mn|net|org|io|me|link|ly)\b)/iu';
        $longNumber = '/\d(?:[\s.-]?\d){7,}/u'; // 8+ digits: account or phone numbers

        return (bool) (preg_match($link, $body) || preg_match($longNumber, $body));
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
