<?php

namespace App\Models;

use App\Services\VerifyMn;
use App\Services\VerifyMnException;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PhoneVerification extends Model
{
    use HasUuids;

    protected $fillable = [
        'phone', 'code', 'session_id', 'status', 'sms_uri', 'display_instruction',
        'expires_at', 'verified_at', 'consumed_at', 'user_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];

    public function isFinal(): bool
    {
        return in_array($this->status, ['VERIFIED', 'EXPIRED'], true);
    }

    /**
     * Ask verify.mn for the real status (callbacks are only a "check now" hint).
     * The API client is only built when a remote check is actually needed, so dev-bypass
     * sessions (already VERIFIED, no session_id) work without a VERIFY_MN_API_KEY.
     */
    public function refreshStatus(?VerifyMn $api = null): string
    {
        if ($this->isFinal() || ! $this->session_id) {
            return $this->status;
        }
        $api ??= app(VerifyMn::class);

        try {
            $remote = $api->getSession($this->session_id);
            $status = $remote['sessionStatus'] ?? 'PENDING';
        } catch (VerifyMnException $e) {
            $status = $e->status === 404 ? 'EXPIRED' : 'PENDING'; // transient errors: keep waiting
        }

        if ($status === 'PENDING' && now()->greaterThanOrEqualTo($this->expires_at)) {
            $status = 'EXPIRED';
        }

        if ($status !== $this->status) {
            $this->update([
                'status' => $status,
                'verified_at' => $status === 'VERIFIED' ? now() : null,
            ]);
        }

        return $status;
    }

    /** What the login page needs. */
    public function toClient(): array
    {
        return [
            'phone' => $this->phone,
            'code' => $this->code,
            'status' => $this->status,
            'sms_uri' => $this->sms_uri,
            'display_instruction' => $this->display_instruction,
            'expires_at' => $this->expires_at->toIso8601String(),
            'shortcode' => VerifyMn::SHORTCODE,
        ];
    }
}
