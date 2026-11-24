<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * verify.mn — Mongolia-only mobile-originated SMS phone verification.
 *
 * The user texts a one-time code to shortcode 144773 from the phone being verified.
 * We never trust callbacks on their own: status always comes from GET /sessions/{id}.
 */
class VerifyMn
{
    public const SHORTCODE = '144773';

    public function __construct(private readonly string $apiKey, private readonly string $baseUrl)
    {
        if ($apiKey === '') {
            throw new RuntimeException('VERIFY_MN_API_KEY is not set. Add it to .env (see .env.example).');
        }
    }

    public static function fromConfig(): self
    {
        return new self((string) config('services.verify_mn.key'), rtrim((string) config('services.verify_mn.base_url'), '/'));
    }

    /** Fresh random 6-digit code for every session — never reused. */
    public static function newCode(): string
    {
        return str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
    }

    /** "+976 9911-2233" / "97699112233" / "99112233" → "99112233"; anything else → null. */
    public static function normalizePhone(string $input): ?string
    {
        $digits = preg_replace('/\D/', '', $input) ?? '';
        if (strlen($digits) === 11 && str_starts_with($digits, '976')) {
            $digits = substr($digits, 3);
        }

        return preg_match('/^\d{8}$/', $digits) ? $digits : null;
    }

    /**
     * POST /sessions — returns sessionId, smsUri, displayInstruction, expiresAt (300s TTL).
     *
     * @return array{sessionId: string, phone: string, shortcode: string, text: string, smsUri: string, displayInstruction: string, expiresAt: string}
     */
    public function createSession(string $phone, string $code, ?string $callbackUrl = null): array
    {
        $payload = ['phone' => $phone, 'text' => $code];
        if ($callbackUrl) {
            $payload['callback'] = $callbackUrl;
        }

        $response = $this->send(fn () => Http::withToken($this->apiKey)->acceptJson()->asJson()->timeout(10)
            ->post("{$this->baseUrl}/sessions", $payload));

        return $response->json();
    }

    /**
     * GET /sessions/{id} — no auth.
     *
     * @return array{sessionId: string, sessionStatus: 'PENDING'|'VERIFIED'|'EXPIRED', callbackStatus: string, verifiedAt: ?string, expiresAt: string}
     */
    public function getSession(string $sessionId): array
    {
        $response = $this->send(fn () => Http::acceptJson()->timeout(5)
            ->get("{$this->baseUrl}/sessions/".rawurlencode($sessionId)));

        return $response->json();
    }

    /**
     * Blocking helper: start a session, hand it to $onSession (to show the instruction),
     * then poll every $interval seconds until VERIFIED (true) or EXPIRED / timed out (false).
     * The web login uses the non-blocking pieces instead; this suits CLI tools and jobs.
     *
     * @param  callable(array):void|null  $onSession
     * @param  callable(int):void|null  $sleep  injectable for tests
     */
    public function verifyPhone(string $phone, ?callable $onSession = null, ?callable $sleep = null, int $interval = 3, int $hardTimeout = 330): bool
    {
        $phone = self::normalizePhone($phone) ?? throw new \InvalidArgumentException('Invalid Mongolian phone number.');
        $sleep ??= fn (int $s) => sleep($s);

        $session = $this->createSession($phone, self::newCode());
        if ($onSession) {
            $onSession($session);
        }

        $expiresAt = Carbon::parse($session['expiresAt']);
        $deadline = now()->addSeconds($hardTimeout);

        while (true) {
            $status = $this->getSession($session['sessionId'])['sessionStatus'] ?? 'PENDING';
            if ($status === 'VERIFIED') {
                return true;
            }
            if ($status === 'EXPIRED' || now()->greaterThanOrEqualTo($expiresAt) || now()->greaterThanOrEqualTo($deadline)) {
                return false;
            }
            $sleep($interval);
        }
    }

    private function send(callable $request): Response
    {
        try {
            /** @var Response $response */
            $response = $request();
        } catch (ConnectionException $e) {
            Log::warning('verify.mn unreachable', ['error' => $e->getMessage()]);
            throw new VerifyMnException('verify.mn is unreachable.');
        }

        if ($response->successful()) {
            return $response;
        }

        // Never log the API key or headers — only status and the API's error body.
        Log::warning('verify.mn request failed', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 300)]);

        throw new VerifyMnException(match ($response->status()) {
            401 => 'verify.mn rejected the API key (401). Check VERIFY_MN_API_KEY.',
            400 => 'verify.mn rejected the request (400).',
            404 => 'verify.mn session not found (404).',
            default => "verify.mn error ({$response->status()}).",
        }, $response->status());
    }
}
