<?php

namespace Tests\Feature;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SocialTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedDebt(?User $owner = null): Debt
    {
        return ($owner ?? User::factory()->create())->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Bill', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'creditor' => 'Khan Bank', 'amount' => 1_000_000, 'color' => 'amber',
            'status' => 'verified', 'verified_at' => now(),
        ]);
    }

    private function pay(Debt $debt, User $donor, int $amount, bool $anon = false): void
    {
        $debt->payments()->create([
            'user_id' => $donor->id,
            'payer_name' => $anon ? 'Anonymous' : $donor->name,
            'anonymous' => $anon,
            'amount' => $amount,
        ]);
    }

    public function test_leaderboard_ranks_named_donors_and_excludes_anonymous(): void
    {
        $debt = $this->verifiedDebt();
        $big = User::factory()->create(['name' => 'Big']);
        $small = User::factory()->create(['name' => 'Small']);
        $ghost = User::factory()->create(['name' => 'Ghost']);

        $this->pay($debt, $big, 500_000);
        $this->pay($debt, $small, 100_000);
        $this->pay($debt, $ghost, 900_000, anon: true); // must not appear or count

        $this->get('/donors')->assertOk()->assertInertia(fn ($p) => $p
            ->where('board.0.user.name', 'Big')->where('board.0.total', 500_000)
            ->where('board.1.user.name', 'Small')
            ->where('totals.donors', 2)
            ->where('totals.given', 600_000)
            ->whereNot('board', fn ($b) => collect($b)->pluck('user.name')->contains('Ghost')));
    }

    public function test_profile_hides_anonymous_donations_and_contact_details(): void
    {
        $donor = User::factory()->create(['name' => 'Sara', 'phone' => '99887766', 'city' => 'UB']);
        $debt = $this->verifiedDebt();
        $this->pay($debt, $donor, 200_000);
        $this->pay($debt, $donor, 50_000, anon: true);

        $this->get("/u/{$donor->id}")->assertOk()->assertInertia(fn ($p) => $p
            ->where('stats.given', 200_000)        // anon 50k excluded
            ->where('stats.helped', 1)
            ->has('donations', 1)
            ->where('profile.name', 'Sara')
            ->missing('profile.phone')
            ->missing('profile.email'));
    }

    public function test_follow_and_unfollow(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();

        $this->post("/u/{$other->id}/follow")->assertRedirect('/login'); // guests can't

        $this->actingAs($me)->post("/u/{$other->id}/follow");
        $this->assertTrue($me->fresh()->isFollowing($other));
        $this->assertDatabaseCount('follows', 1);

        $this->actingAs($me)->post("/u/{$other->id}/follow"); // idempotent
        $this->assertDatabaseCount('follows', 1);

        $this->actingAs($me)->delete("/u/{$other->id}/follow");
        $this->assertFalse($me->fresh()->isFollowing($other));
    }

    public function test_cannot_follow_yourself(): void
    {
        $me = User::factory()->create();
        $this->actingAs($me)->post("/u/{$me->id}/follow")->assertStatus(422);
        $this->assertDatabaseCount('follows', 0);
    }

    public function test_dashboard_feed_shows_followed_users_activity(): void
    {
        $me = User::factory()->create();
        $hero = User::factory()->create(['name' => 'Hero']);
        $me->following()->attach($hero->id);
        $this->pay($this->verifiedDebt(), $hero, 300_000);

        $this->actingAs($me)->get('/dashboard')->assertInertia(fn ($p) => $p
            ->where('feed.0.who.name', 'Hero')
            ->where('feed.0.type', 'donated'));
    }

    public function test_home_shows_registered_user_count(): void
    {
        User::factory()->count(3)->create();

        $this->get('/')->assertInertia(fn ($p) => $p
            ->where('stats.users', User::count())
            ->has('stats.usersWeek'));
    }

    public function test_companies_and_individuals_rank_separately(): void
    {
        $debt = $this->verifiedDebt();
        $company = User::factory()->create(['name' => 'Khan Bank', 'is_company' => true, 'company_verified' => true, 'website' => 'khanbank.com']);
        $person = User::factory()->create(['name' => 'Bat']);

        $this->pay($debt, $company, 1_000_000);
        $this->pay($debt, $person, 50_000);

        // /companies shows only the company
        $this->get('/companies')->assertOk()->assertInertia(fn ($p) => $p
            ->has('board', 1)
            ->where('board.0.user.name', 'Khan Bank')
            ->where('board.0.user.company_verified', true)
            ->where('board.0.user.website', 'khanbank.com')
            ->where('totals.companies', 1));

        // /donors (individuals) excludes the company
        $this->get('/donors')->assertOk()->assertInertia(fn ($p) => $p
            ->has('board', 1)
            ->where('board.0.user.name', 'Bat'));

        // Home carries both buckets
        $this->get('/')->assertInertia(fn ($p) => $p
            ->where('topCompanies.0.user.name', 'Khan Bank')
            ->where('topDonors.0.user.name', 'Bat'));
    }

    public function test_company_profile_shows_as_organization(): void
    {
        $company = User::factory()->create(['name' => 'MCS', 'is_company' => true, 'company_verified' => true, 'website' => 'mcs.mn', 'phone' => '77001122']);
        $this->pay($this->verifiedDebt(), $company, 300_000);

        $this->get("/u/{$company->id}")->assertOk()->assertInertia(fn ($p) => $p
            ->where('profile.is_company', true)
            ->where('profile.website', 'mcs.mn')
            ->where('stats.given', 300_000)
            ->missing('profile.phone'));
    }

    public function test_company_can_upload_a_logo(): void
    {
        Storage::fake('public');
        $company = User::factory()->create(['is_company' => true, 'company_verified' => true, 'name' => 'Khan']);

        $this->actingAs($company)->patch('/settings/profile', [
            'name' => 'Khan Bank',
            'website' => 'khanbank.com',
            'logo' => UploadedFile::fake()->image('logo.png', 240, 240),
        ])->assertSessionHasNoErrors();

        $company->refresh();
        $this->assertNotNull($company->logo_path);
        Storage::disk('public')->assertExists($company->logo_path);
        $this->assertStringStartsWith('/storage/logos/', $company->logo_url);
        $this->assertSame('khanbank.com', $company->website);

        $this->get("/u/{$company->id}")->assertInertia(fn ($p) => $p->where('profile.logo_url', $company->logo_url));
    }

    public function test_logo_upload_rejects_non_images(): void
    {
        Storage::fake('public');
        $company = User::factory()->create(['is_company' => true, 'name' => 'Co']);

        $this->actingAs($company)->patch('/settings/profile', [
            'name' => 'Co', 'logo' => UploadedFile::fake()->create('x.svg', 10, 'image/svg+xml'),
        ])->assertSessionHasErrors('logo');

        $this->assertNull($company->fresh()->logo_path);
    }

    public function test_people_can_set_a_photo_but_not_a_website(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['is_company' => false]);

        $this->actingAs($user)->patch('/settings/profile', [
            'name' => 'Person', 'website' => 'hacker.mn', 'logo' => UploadedFile::fake()->image('me.png'),
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertStringStartsWith('avatars/', $user->logo_path, 'a profile photo, stored apart from company logos');
        Storage::disk('public')->assertExists($user->logo_path);
        $this->assertNull($user->website);
    }

    public function test_profile_shows_phone_verified_without_the_number(): void
    {
        $user = User::factory()->create(['phone' => '99112233']);
        $user->forceFill(['phone_verified_at' => now()])->save();

        $this->get("/u/{$user->id}")->assertInertia(fn ($p) => $p
            ->where('profile.phone_verified', true)
            ->missing('profile.phone'));
        $this->get('/u/'.User::factory()->create()->id)->assertInertia(fn ($p) => $p->where('profile.phone_verified', false));
    }

    public function test_email_register_as_company(): void
    {
        $this->post('/register', [
            'name' => 'Gobi LLC',
            'email' => 'gobi@test.mn',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'is_company' => true,
            'website' => 'gobi.mn',
        ])->assertRedirect('/dashboard');

        $user = User::where('email', 'gobi@test.mn')->firstOrFail();
        $this->assertTrue($user->is_company);
        $this->assertFalse($user->company_verified); // unverified until an admin approves
        $this->assertSame('gobi.mn', $user->website);
    }

    public function test_admin_verifies_a_company(): void
    {
        $company = User::factory()->create(['is_company' => true, 'company_verified' => false, 'name' => 'Co']);
        $admin = tap(User::factory()->create(), fn ($u) => $u->forceFill(['is_admin' => true])->save());

        $this->get('/admin')->assertRedirect('/login'); // guard
        $this->actingAs(User::factory()->create())->post("/admin/companies/{$company->id}/verify")->assertForbidden();

        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p->where('pendingCompanies.0.id', $company->id));
        $this->actingAs($admin)->post("/admin/companies/{$company->id}/verify")->assertRedirect();
        $this->assertTrue($company->fresh()->company_verified);
    }

    public function test_dashboard_shows_user_stats(): void
    {
        $me = User::factory()->create();
        $me->debts()->create([
            'name' => 'Me', 'city' => 'UB', 'title' => 'Bill', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'creditor' => 'Bank', 'amount' => 100000, 'color' => 'amber', 'status' => 'verified', 'verified_at' => now(),
        ]);
        $this->pay($this->verifiedDebt(), $me, 25000);

        $this->actingAs($me)->get('/dashboard')->assertInertia(fn ($p) => $p
            ->where('me.name', $me->name)
            ->where('stats.given', 25000)
            ->where('stats.helped', 1)
            ->where('stats.requests', 1));
    }
}
