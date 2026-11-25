<?php

namespace Tests\Feature;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DebtTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        Storage::fake('public');
    }

    private function makeDebt(User $owner, int $amount = 1_000_000, string $status = 'verified'): Debt
    {
        return $owner->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Car loan', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'creditor' => 'Khan Bank', 'amount' => $amount, 'color' => 'amber',
            'status' => $status, 'verified_at' => $status === 'verified' ? now() : null,
        ]);
    }

    private function admin(): User
    {
        return tap(User::factory()->create())->forceFill(['is_admin' => true])->save() ? User::latest('id')->first() : null;
    }

    public function test_public_pages_load(): void
    {
        $debt = $this->makeDebt(User::factory()->create());

        foreach (['/', '/discover', '/debts', "/debts/{$debt->id}", '/transparency', '/verify', '/verify?code=FM-NOPE'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_guest_cannot_post_or_pay(): void
    {
        $debt = $this->makeDebt(User::factory()->create());

        $this->get('/debts/new')->assertRedirect('/login');
        $this->post("/debts/{$debt->id}/pay", ['amount' => 5000])->assertRedirect('/login');
    }

    public function test_posting_needs_a_payout_account_not_a_bill_and_starts_pending(): void
    {
        $user = User::factory()->create();
        $fields = [
            'name' => 'Sarnai', 'city' => 'UB', 'title' => 'Rent', 'story' => str_repeat('a', 60),
            'category' => 'rent', 'amount' => '2,700,000',
        ];

        // No payout account → rejected. A bill/document is not required any more.
        $this->actingAs($user)->post('/debts', $fields)
            ->assertSessionHasErrors(['bank_name', 'bank_account', 'account_holder'])
            ->assertSessionDoesntHaveErrors(['bill', 'creditor']);

        $this->actingAs($user)->post('/debts', [
            ...$fields,
            'bank_name' => 'Хаан банк', 'bank_account' => '5000 123 456', 'account_holder' => 'Sarnai',
            'photo' => UploadedFile::fake()->image('me.jpg', 800, 500),
        ])->assertSessionHasNoErrors()->assertRedirect();

        $debt = Debt::firstOrFail();
        $this->assertSame('pending', $debt->status);
        $this->assertSame(2_700_000, $debt->amount);
        $this->assertSame('5000123456', $debt->bank_account, 'spaces are stripped');
        $this->assertNull($debt->bill_path);
        $this->assertNull($debt->creditor);
        Storage::disk('public')->assertExists($debt->photo_path);
        $this->assertStringStartsWith('/storage/photos/', $debt->photo_url);
    }

    public function test_optional_supporting_document_is_stored_privately(): void
    {
        $this->actingAs(User::factory()->create())->post('/debts', [
            'name' => 'Bold', 'city' => 'UB', 'title' => 'Tuition', 'story' => str_repeat('a', 60),
            'category' => 'tuition', 'amount' => '900,000',
            'bank_name' => 'Голомт банк', 'bank_account' => 'mn123456789012345678', 'account_holder' => 'Bold',
            'bill' => UploadedFile::fake()->create('contract.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $debt = Debt::firstOrFail();
        Storage::assertExists($debt->bill_path);
        $this->assertSame('MN123456789012345678', $debt->bank_account);
    }

    public function test_payout_account_must_look_real_and_stays_private(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/debts', [
            'name' => 'Bold', 'city' => 'UB', 'title' => 'Tuition', 'story' => str_repeat('a', 60),
            'category' => 'tuition', 'amount' => '900,000',
            'bank_name' => 'Fake bank', 'bank_account' => 'abc', 'account_holder' => 'Bold',
        ])->assertSessionHasErrors(['bank_name', 'bank_account']);

        $debt = $this->makeDebt($user);
        $debt->update(['bank_name' => 'Хаан банк', 'bank_account' => '5000123456', 'account_holder' => 'Bat']);
        $this->get("/debts/{$debt->id}")->assertOk()->assertDontSee('5000123456');
    }

    public function test_pending_debt_is_hidden_and_cannot_be_paid(): void
    {
        $owner = User::factory()->create();
        $debt = $this->makeDebt($owner, status: 'pending');

        $this->get("/debts/{$debt->id}")->assertNotFound();
        $this->actingAs($owner)->get("/debts/{$debt->id}")->assertOk();
        $this->actingAs(User::factory()->create())->post("/debts/{$debt->id}/pay", ['amount' => 5000])->assertSessionHasErrors('amount');
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_payment_is_capped_at_remaining(): void
    {
        $debt = $this->makeDebt(User::factory()->create(), 100_000);
        $patron = User::factory()->create();

        $this->actingAs($patron)->post("/debts/{$debt->id}/pay", ['amount' => 999_999, 'anonymous' => true])->assertSessionHasNoErrors();

        $this->assertSame(0, $debt->fresh()->remaining);
        $this->assertSame('funded', $debt->fresh()->phase);
        $this->actingAs($patron)->post("/debts/{$debt->id}/pay", ['amount' => 5000])->assertSessionHasErrors('amount');
    }

    public function test_owner_cannot_pay_own_debt(): void
    {
        $owner = User::factory()->create();
        $debt = $this->makeDebt($owner);

        $this->actingAs($owner)->post("/debts/{$debt->id}/pay", ['amount' => 5000])->assertSessionHasErrors('amount');
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_only_admins_reach_admin_pages(): void
    {
        $debt = $this->makeDebt(User::factory()->create(), status: 'pending');

        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs(User::factory()->create())->post("/admin/debts/{$debt->id}/review", ['decision' => 'verified', 'note' => 'x'])->assertForbidden();
        $this->actingAs($this->admin())->get('/admin')->assertOk();
    }

    public function test_admin_verifies_then_disburses_with_public_code(): void
    {
        $admin = $this->admin();
        $debt = $this->makeDebt(User::factory()->create(), 100_000, 'pending');

        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/review", ['decision' => 'verified', 'note' => 'ID + bill checked'])->assertRedirect();
        $this->assertSame('verified', $debt->fresh()->status);
        $this->assertNotNull($debt->fresh()->verified_at);

        $this->actingAs(User::factory()->create())->post("/debts/{$debt->id}/pay", ['amount' => 100_000]);

        // Can't send more than was collected.
        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/disburse", [
            'amount' => 200_000, 'reference' => 'KHAN-1', 'receipt' => UploadedFile::fake()->create('r.pdf', 50, 'application/pdf'),
        ])->assertSessionHasErrors('amount');

        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/disburse", [
            'amount' => 100_000, 'reference' => 'KHAN-1', 'receipt' => UploadedFile::fake()->create('r.pdf', 50, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $debt->refresh();
        $this->assertSame('settled', $debt->phase);
        $code = $debt->disbursements()->value('code');
        $this->assertMatchesRegularExpression('/^FM-[A-Z2-9]{8}$/', $code);

        $this->get('/verify?code='.strtolower($code))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('result.code', $code)->where('result.amount', 100_000));
        $this->get("/receipts/{$code}")->assertOk();
    }

    public function test_small_bills_get_their_own_section_and_filter(): void
    {
        $owner = User::factory()->create();
        $small = $this->makeDebt($owner, 25_000);
        $big = $this->makeDebt($owner, 3_000_000);

        $this->get('/')->assertInertia(fn ($p) => $p
            ->has('small', 1)->where('small.0.id', $small->id)
            ->has('featured', 1)->where('featured.0.id', $big->id));

        $this->get('/debts?small=1')->assertInertia(fn ($p) => $p->has('debts', 1)->where('debts.0.id', $small->id));
    }

    public function test_lunch_money_sized_debts_can_be_posted(): void
    {
        $this->actingAs(User::factory()->create())->post('/debts', [
            'name' => 'Toroo', 'city' => 'UB', 'title' => 'Lunch', 'story' => str_repeat('a', 60),
            'category' => 'food', 'amount' => '5,000',
            'bank_name' => 'Хаан банк', 'bank_account' => '5000123456', 'account_holder' => 'Toroo',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('debts', ['category' => 'food', 'amount' => 5000]);
    }

    public function test_discover_filters_by_category_and_counts(): void
    {
        $owner = User::factory()->create();
        $this->makeDebt($owner)->update(['category' => 'food']);
        $this->makeDebt($owner)->update(['category' => 'transport']);
        $this->makeDebt($owner)->update(['category' => 'food']);

        $this->get('/discover')->assertInertia(fn ($p) => $p
            ->where('total', 3)
            ->where('categories.food', 2)
            ->where('categories.transport', 1)
            ->has('debts', 3));

        $this->get('/discover?cat=food')->assertInertia(fn ($p) => $p
            ->where('cat', 'food')
            ->has('debts', 2));

        // Invalid category is ignored (shows all).
        $this->get('/discover?cat=bogus')->assertInertia(fn ($p) => $p->where('cat', null)->has('debts', 3));
    }
}
