<?php

namespace Tests\Feature\Auth;

use App\Models\PhoneVerification;
use App\Models\User;
use App\Services\VerifyMn;
use App\Services\VerifyMnException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class PhoneLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.verify_mn.key' => 'vrf_test_key', 'services.verify_mn.base_url' => 'https://api.verify.mn']);
        Http::preventStrayRequests();
    }

    private function created(string $id = 'sess_1', int $ttl = 300): array
    {
        return [
            'sessionId' => $id,
            'phone' => '99112233',
            'shortcode' => '144773',
            'text' => '123456',
            'smsUri' => 'sms:144773?body=123456',
            'displayInstruction' => '99112233 дугаараасаа 144773 руу 123456 гэж илгээнэ үү.',
            'expiresAt' => now()->addSeconds($ttl)->toIso8601String(),
        ];
    }

    private function remote(string $s): array
    {
        return ['sessionId' => 'sess_1', 'sessionStatus' => $s, 'callbackStatus' => 'PENDING', 'verifiedAt' => null, 'expiresAt' => now()->addMinutes(5)->toIso8601String()];
    }

    // ── verifyPhone(): the blocking helper from the integration guide ──

    public function test_verify_phone_returns_true_after_pending_then_verified(): void
    {
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created()),
            'api.verify.mn/sessions/*' => Http::sequence()
                ->push($this->remote('PENDING'))
                ->push($this->remote('PENDING'))
                ->push($this->remote('VERIFIED')),
        ]);
        $sleeps = 0;

        $ok = app(VerifyMn::class)->verifyPhone('+976 9911 2233', sleep: function () use (&$sleeps) {
            $sleeps++;
        });

        $this->assertTrue($ok);
        $this->assertSame(2, $sleeps); // polled 3 times, slept between
        Http::assertSent(fn (Request $r) => $r->method() === 'POST'
            && $r->hasHeader('Authorization', 'Bearer vrf_test_key')
            && $r['phone'] === '99112233'
            && preg_match('/^\d{6}$/', $r['text']) === 1
            && ! isset($r['callback']));
    }

    public function test_verify_phone_returns_false_when_session_expires(): void
    {
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created()),
            'api.verify.mn/sessions/*' => Http::sequence()->push($this->remote('PENDING'))->push($this->remote('EXPIRED')),
        ]);

        $this->assertFalse(app(VerifyMn::class)->verifyPhone('99112233', sleep: fn () => null));
    }

    public function test_verify_phone_gives_up_at_expires_at_even_if_still_pending(): void
    {
        Carbon::setTestNow(now());
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created(ttl: 9)),
            'api.verify.mn/sessions/*' => Http::response($this->remote('PENDING')),
        ]);

        $ok = app(VerifyMn::class)->verifyPhone('99112233', sleep: fn (int $s) => Carbon::setTestNow(now()->addSeconds($s)));

        $this->assertFalse($ok);
        Http::assertSentCount(1 + 4); // create + polls at t=0,3,6,9
    }

    public function test_bad_api_key_raises_401(): void
    {
        Http::fake(['api.verify.mn/sessions' => Http::response(['message' => 'Unauthorized'], 401)]);

        try {
            app(VerifyMn::class)->createSession('99112233', '123456');
            $this->fail('Expected VerifyMnException');
        } catch (VerifyMnException $e) {
            $this->assertSame(401, $e->status);
            $this->assertStringNotContainsString('vrf_test_key', $e->getMessage());
        }
    }

    public function test_missing_api_key_fails_loudly(): void
    {
        config(['services.verify_mn.key' => null]);
        $this->expectException(RuntimeException::class);
        app(VerifyMn::class);
    }

    public function test_codes_are_random_six_digits(): void
    {
        $codes = collect(range(1, 50))->map(fn () => VerifyMn::newCode());
        $this->assertTrue($codes->every(fn ($c) => preg_match('/^\d{6}$/', $c) === 1));
        $this->assertGreaterThan(45, $codes->unique()->count());
    }

    // ── Web flow ──

    public function test_new_user_signs_up_with_phone(): void
    {
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created()),
            'api.verify.mn/sessions/*' => Http::sequence()->push($this->remote('PENDING'))->push($this->remote('VERIFIED')),
        ]);

        $this->post('/login/phone', ['phone' => '9911-2233'])->assertRedirect('/login');
        $v = PhoneVerification::firstOrFail();
        $this->assertSame('sess_1', $v->session_id);
        $this->assertSame('99112233', $v->phone);

        $this->get('/login')->assertInertia(fn ($p) => $p->component('auth/phone-login')->where('verification.code', $v->code));

        $this->getJson('/login/phone/status')->assertJson(['status' => 'PENDING']);
        $this->getJson('/login/phone/status')->assertJson(['status' => 'VERIFIED']);
        $this->getJson('/login/phone/status')->assertJson(['status' => 'VERIFIED']); // final: no extra API call
        Http::assertSentCount(3);

        $this->post('/login/phone/complete')->assertRedirect('/login/phone/name');
        $this->assertGuest();

        $this->post('/login/phone/name', ['name' => 'Болд'])->assertRedirect('/dashboard');
        $this->assertAuthenticated();
        $user = User::firstOrFail();
        $this->assertSame('99112233', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNull($user->email);
        $this->assertNotNull($v->fresh()->consumed_at);
    }

    public function test_existing_user_logs_straight_in(): void
    {
        $user = User::factory()->create(['phone' => '88001122']);
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created()),
            'api.verify.mn/sessions/*' => Http::response($this->remote('VERIFIED')),
        ]);

        $this->post('/login/phone', ['phone' => '88001122']);
        $this->post('/login/phone/complete')->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_cannot_complete_without_verification(): void
    {
        Http::fake([
            'api.verify.mn/sessions' => Http::response($this->created()),
            'api.verify.mn/sessions/*' => Http::response($this->remote('PENDING')),
        ]);

        $this->post('/login/phone', ['phone' => '99112233']);
        $this->post('/login/phone/complete')->assertRedirect('/login')->assertSessionHasErrors('phone');
        $this->assertGuest();
        $this->post('/login/phone/name', ['name' => 'Hacker'])->assertRedirect('/login');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_invalid_phone_and_api_errors_show_a_message(): void
    {
        $this->post('/login/phone', ['phone' => '12345'])->assertSessionHasErrors('phone');

        Http::fake(['api.verify.mn/sessions' => Http::response(['message' => 'Unauthorized'], 401)]);
        $this->post('/login/phone', ['phone' => '99112233'])->assertSessionHasErrors('phone');
        $this->assertDatabaseCount('phone_verifications', 0);
    }

    public function test_callback_returns_200_and_rechecks_status(): void
    {
        Http::fake(['api.verify.mn/sessions/*' => Http::response($this->remote('VERIFIED'))]);
        $v = PhoneVerification::create([
            'phone' => '99112233', 'code' => '123456', 'session_id' => 'sess_1', 'status' => 'PENDING', 'expires_at' => now()->addMinutes(5),
        ]);

        $this->get("/verify-mn/callback/{$v->id}")->assertOk();

        $this->assertSame('VERIFIED', $v->fresh()->status);
        Http::assertSent(fn (Request $r) => $r->method() === 'GET' && str_ends_with($r->url(), '/sessions/sess_1'));
    }
}
