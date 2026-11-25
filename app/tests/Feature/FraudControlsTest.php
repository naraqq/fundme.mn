<?php

namespace Tests\Feature;

use App\Models\AdminAction;
use App\Models\Debt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FraudControlsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        config(['fraud.new_account_days' => 7, 'fraud.new_account_max' => 1_000_000, 'fraud.auto_pause_reports' => 3]);
    }

    private function user(int $daysOld = 30): User
    {
        $u = User::factory()->create();
        $u->forceFill(['created_at' => now()->subDays($daysOld)])->save();

        return $u;
    }

    private function admin(): User
    {
        return tap(User::factory()->create())->forceFill(['is_admin' => true])->save()
            ? User::latest('id')->first() : null;
    }

    private function makeDebt(User $owner, array $attrs = []): Debt
    {
        return $owner->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Car loan', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'amount' => 500_000, 'color' => 'amber', 'status' => 'verified', 'verified_at' => now(),
            'bank_name' => 'Хаан банк', 'bank_account' => '5000123456', 'account_holder' => 'Bat',
            ...$attrs,
        ]);
    }

    private function postFields(array $overrides = []): array
    {
        return [
            'name' => 'Sarnai', 'city' => 'UB', 'title' => 'Rent', 'story' => str_repeat('a', 60),
            'category' => 'rent', 'amount' => '300,000',
            'bank_name' => 'Хаан банк', 'bank_account' => '5000999888', 'account_holder' => 'Sarnai',
            ...$overrides,
        ];
    }

    public function test_one_active_request_at_a_time(): void
    {
        $user = $this->user();
        $this->makeDebt($user, ['status' => 'pending', 'verified_at' => null]);

        $this->actingAs($user)->get('/debts/new')->assertInertia(fn ($p) => $p->where('active.title', 'Car loan'));
        $this->actingAs($user)->post('/debts', $this->postFields())->assertSessionHasErrors('active');
        $this->assertSame(1, Debt::count());
    }

    public function test_rejected_or_paid_out_requests_dont_block_a_new_one(): void
    {
        $user = $this->user();
        $this->makeDebt($user, ['status' => 'rejected']);
        $paidOut = $this->makeDebt($user, ['amount' => 10_000]);
        $paidOut->payments()->create(['user_id' => $this->user()->id, 'payer_name' => 'X', 'anonymous' => false, 'amount' => 10_000]);
        $paidOut->disbursements()->create(['code' => 'FM-TEST0001', 'amount' => 10_000, 'reference' => 'R', 'receipt_path' => 'r', 'paid_at' => now()]);

        $this->actingAs($user)->post('/debts', $this->postFields())->assertSessionHasNoErrors();
        $this->assertSame(3, Debt::count());
    }

    public function test_new_accounts_are_capped(): void
    {
        $fresh = $this->user(daysOld: 1);
        $this->actingAs($fresh)->post('/debts', $this->postFields(['amount' => '2,000,000']))->assertSessionHasErrors('amount');
        $this->actingAs($fresh)->post('/debts', $this->postFields(['amount' => '900,000']))->assertSessionHasNoErrors();

        $this->actingAs($this->user(daysOld: 30))->post('/debts', $this->postFields(['amount' => '2,000,000']))->assertSessionHasNoErrors();
    }

    public function test_bank_account_is_encrypted_at_rest_with_a_fingerprint(): void
    {
        $debt = $this->makeDebt($this->user(), ['bank_account' => '5000 123-456']);

        $raw = DB::table('debts')->where('id', $debt->id)->value('bank_account');
        $this->assertStringNotContainsString('5000', $raw);
        $this->assertSame('5000 123-456', $debt->fresh()->bank_account);
        $this->assertSame(Debt::fingerprint('5000123456'), $debt->fresh()->bank_account_hash, 'spaces/dashes ignored');
    }

    public function test_reports_pause_a_request_after_three_different_people(): void
    {
        $owner = $this->user();
        $debt = $this->makeDebt($owner);
        [$a, $b, $c] = [$this->user(), $this->user(), $this->user()];

        $this->actingAs($owner)->post("/debts/{$debt->id}/report", ['reason' => 'scam'])->assertForbidden();

        $this->actingAs($a)->post("/debts/{$debt->id}/report", ['reason' => 'scam'])->assertSessionHasNoErrors();
        $this->actingAs($a)->post("/debts/{$debt->id}/report", ['reason' => 'fake_story'])->assertSessionHasNoErrors(); // same person: updates
        $this->actingAs($b)->post("/debts/{$debt->id}/report", ['reason' => 'scam']);
        $this->assertFalse($debt->fresh()->paused);

        $this->actingAs($c)->post("/debts/{$debt->id}/report", ['reason' => 'duplicate']);
        $this->assertTrue($debt->fresh()->paused);
        $this->assertSame(3, $debt->reports()->count());
        $this->assertDatabaseHas('admin_actions', ['action' => 'auto_paused', 'debt_id' => $debt->id, 'admin_id' => null]);

        // Paused: hidden from the public, from discovery, and no donations.
        $this->get("/debts/{$debt->id}")->assertNotFound();
        $this->get('/discover')->assertInertia(fn ($p) => $p->where('total', 0));
        $this->actingAs($this->user())->post("/debts/{$debt->id}/pay", ['amount' => 5000])->assertSessionHasErrors('amount');
        $this->actingAs($owner)->get("/debts/{$debt->id}")->assertOk();
    }

    public function test_admin_can_dismiss_reports_and_payouts_are_blocked_while_paused(): void
    {
        $admin = $this->admin();
        $debt = $this->makeDebt($this->user());
        $debt->payments()->create(['user_id' => $this->user()->id, 'payer_name' => 'X', 'anonymous' => false, 'amount' => 50_000]);
        $debt->reports()->create(['user_id' => $this->user()->id, 'reason' => 'scam']);
        $debt->forceFill(['flagged_at' => now()])->save();

        $payout = ['amount' => '50,000', 'reference' => 'TX1', 'receipt' => UploadedFile::fake()->create('r.pdf', 10, 'application/pdf')];
        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/disburse", $payout)->assertSessionHasErrors('amount');
        $this->assertSame(0, $debt->disbursements()->count());

        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p->has('reported', 1)->where('reported.0.reports.0.reason', 'scam'));

        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/reports/dismiss", ['note' => 'Called, checked ID'])->assertSessionHasNoErrors();
        $this->assertFalse($debt->fresh()->paused);
        $this->assertSame(0, $debt->reports()->open()->count());

        $payout['receipt'] = UploadedFile::fake()->create('r.pdf', 10, 'application/pdf');
        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/disburse", $payout)->assertSessionHasNoErrors();
        $this->assertSame(
            ['reports_dismissed', 'paid_out'],
            AdminAction::orderBy('id')->pluck('action')->all(),
        );
    }

    public function test_admin_sees_risk_warnings(): void
    {
        $admin = $this->admin();
        $first = $this->makeDebt($this->user(), ['bank_account' => '5000777000']);
        // Someone else, brand new, using the same account under a different holder name.
        $fresh = $this->user(daysOld: 0);
        $this->makeDebt($fresh, [
            'status' => 'pending', 'verified_at' => null, 'name' => 'Dorj',
            'bank_account' => '5000 777 000', 'account_holder' => 'Ganbat Tsetseg',
        ]);

        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p
            ->where('pending.0.risks.0.0', 'shared_account')
            ->where('pending.0.risks.0.1.requests.0.id', $first->id)
            ->where('pending.0.risks.1.0', 'holder_mismatch')
            ->where('pending.0.risks.2.0', 'new_account'));
    }

    public function test_matching_holder_name_is_not_flagged(): void
    {
        $admin = $this->admin();
        $this->makeDebt($this->user(), ['status' => 'pending', 'verified_at' => null, 'name' => 'Сарнай', 'account_holder' => 'Батын Сарнай']);

        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p->where('pending.0.risks', []));
    }

    public function test_review_decisions_are_logged(): void
    {
        $admin = $this->admin();
        $debt = $this->makeDebt($this->user(), ['status' => 'pending', 'verified_at' => null]);

        $this->actingAs($admin)->post("/admin/debts/{$debt->id}/review", ['decision' => 'verified', 'note' => 'Called her']);

        $this->assertDatabaseHas('admin_actions', ['action' => 'approved', 'debt_id' => $debt->id, 'admin_id' => $admin->id]);
        $this->actingAs($admin)->get('/admin')->assertInertia(fn ($p) => $p->where('history.0.action', 'approved')->where('history.0.details.note', 'Called her'));
    }
}
