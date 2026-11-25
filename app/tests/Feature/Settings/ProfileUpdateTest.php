<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/settings/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_phone_user_can_delete_their_account_and_donations_become_anonymous()
    {
        $user = User::factory()->create(['password' => null, 'phone' => '99001122']);
        $debt = User::factory()->create()->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Loan', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'creditor' => 'Khan Bank', 'amount' => 100000, 'color' => 'amber',
            'status' => 'verified', 'verified_at' => now(),
        ]);
        $payment = $debt->payments()->create(['user_id' => $user->id, 'payer_name' => $user->name, 'anonymous' => false, 'amount' => 5000]);

        $this->actingAs($user)->delete('/settings/profile', ['confirm' => true])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
        $payment->refresh();
        $this->assertTrue($payment->anonymous);
        $this->assertSame('Anonymous', $payment->payer_name);
        $this->assertSame(5000, $debt->fresh()->paid, 'the money record must survive');
    }

    public function test_deleting_requires_explicit_confirmation()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->from('/settings/profile')->delete('/settings/profile')
            ->assertSessionHasErrors('confirm')
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_password_and_appearance_pages_are_gone()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/settings/password')->assertNotFound();
        $this->actingAs($user)->get('/settings/appearance')->assertNotFound();
    }
}
