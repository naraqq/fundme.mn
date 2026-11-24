<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DevPhoneBypassTest extends TestCase
{
    use RefreshDatabase;

    public function test_allowlisted_number_skips_sms_in_local(): void
    {
        config(['services.verify_mn.dev_phones' => ['80105376']]);
        Http::preventStrayRequests(); // bypass must not call verify.mn at all

        $this->post('/login/phone', ['phone' => '8010-5376'])->assertRedirect('/login');

        $this->getJson('/login/phone/status')->assertJson(['status' => 'VERIFIED']);
        $this->post('/login/phone/complete')->assertRedirect('/login/phone/name');
        $this->post('/login/phone/name', ['name' => 'Owner'])->assertRedirect('/dashboard');

        $this->assertAuthenticated();
        $this->assertSame('80105376', User::firstOrFail()->phone);
    }

    public function test_non_allowlisted_number_still_uses_sms(): void
    {
        config([
            'services.verify_mn.dev_phones' => ['80105376'],
            'services.verify_mn.key' => 'vrf_test',
        ]);
        Http::fake([
            'api.verify.mn/sessions' => Http::response([
                'sessionId' => 's1', 'phone' => '99112233', 'shortcode' => '144773', 'text' => '123456',
                'smsUri' => 'sms:144773?body=123456', 'displayInstruction' => 'Send 123456', 'expiresAt' => now()->addMinutes(5)->toIso8601String(),
            ]),
            'api.verify.mn/sessions/*' => Http::response(['sessionId' => 's1', 'sessionStatus' => 'PENDING', 'callbackStatus' => 'PENDING', 'verifiedAt' => null, 'expiresAt' => now()->addMinutes(5)->toIso8601String()]),
        ]);

        $this->post('/login/phone', ['phone' => '99112233'])->assertRedirect('/login');

        Http::assertSent(fn ($r) => $r->method() === 'POST'); // a real session was created
        $this->getJson('/login/phone/status')->assertJson(['status' => 'PENDING']);
    }

    public function test_empty_allowlist_in_production_falls_through_to_sms(): void
    {
        // config/services.php forces dev_phones to [] in production; simulate that result.
        config(['services.verify_mn.dev_phones' => [], 'services.verify_mn.key' => 'vrf_test']);
        Http::fake(['api.verify.mn/sessions' => Http::response(['message' => 'x'], 401)]);

        $this->post('/login/phone', ['phone' => '80105376'])->assertSessionHasErrors('phone');
        $this->assertDatabaseCount('phone_verifications', 0);
    }
}
