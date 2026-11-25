<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Audit log: who did what to which request or user. admin_id is null for automatic actions. */
class AdminAction extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['admin_id', 'action', 'debt_id', 'user_id', 'details'];

    protected $casts = ['details' => 'array'];

    public static function log(string $action, ?Debt $debt = null, ?User $subject = null, array $details = []): self
    {
        return static::create([
            'admin_id' => auth()->user()?->is_admin ? auth()->id() : null,
            'action' => $action,
            'debt_id' => $debt?->id,
            'user_id' => $subject?->id,
            'details' => $details ?: null,
        ]);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function debt(): BelongsTo
    {
        return $this->belongsTo(Debt::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
