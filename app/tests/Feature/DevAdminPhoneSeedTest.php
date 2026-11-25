<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DebtSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DevAdminPhoneSeedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_seeded_admin_gets_the_dev_phone(): void
    {
        config(['services.verify_mn.dev_admin_phone' => '9911-2233']);

        $this->seed(DebtSeeder::class);

        $admin = User::where('phone', '99112233')->sole();
        $this->assertTrue((bool) $admin->is_admin);
        $this->assertSame('admin@example.com', $admin->email);
    }

    public function test_existing_user_with_that_phone_becomes_admin_instead(): void
    {
        config(['services.verify_mn.dev_admin_phone' => '99112233']);
        $me = User::factory()->create(['phone' => '99112233']);

        $this->seed(DebtSeeder::class);

        $this->assertTrue((bool) $me->fresh()->is_admin);
        $this->assertSame(1, User::where('phone', '99112233')->count());
    }

    public function test_nothing_happens_without_the_setting(): void
    {
        config(['services.verify_mn.dev_admin_phone' => null]);

        $this->seed(DebtSeeder::class);

        $this->assertSame(0, User::whereNotNull('phone')->count());
    }
}
