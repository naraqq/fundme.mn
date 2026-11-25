<?php

namespace Tests\Feature;

use App\Models\Debt;
use App\Models\Disbursement;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentStatusTest extends TestCase
{
    use RefreshDatabase;

    private function makeDebt(int $amount = 100_000): Debt
    {
        return User::factory()->create()->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Car loan', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'creditor' => 'Khan Bank', 'amount' => $amount, 'color' => 'amber',
            'status' => 'verified', 'verified_at' => now(),
        ]);
    }

    private function pay(Debt $debt, User $donor, int $amount, string $status = Payment::PAID): Payment
    {
        return $debt->payments()->create([
            'user_id' => $donor->id, 'payer_name' => $donor->name, 'anonymous' => false,
            'amount' => $amount, 'fee' => Payment::feeFor($amount), 'status' => $status,
        ]);
    }

    public function test_fee_is_charged_on_top_and_rounded_up(): void
    {
        config(['payments.fee_percent' => 1.0]);
        $this->assertSame(500, Payment::feeFor(50_000));
        $this->assertSame(11, Payment::feeFor(1_001)); // 10.01 → 11

        config(['payments.fee_percent' => 1.5]);
        $this->assertSame(750, Payment::feeFor(50_000));
    }

    public function test_paying_records_the_fee_and_credits_the_full_donation(): void
    {
        config(['payments.fee_percent' => 1.0]);
        $debt = $this->makeDebt();

        $this->actingAs(User::factory()->create())->post("/debts/{$debt->id}/pay", ['amount' => 40_000])->assertSessionHasNoErrors();

        $payment = Payment::sole();
        $this->assertSame([40_000, 400, Payment::PAID], [$payment->amount, $payment->fee, $payment->status]);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame(40_000, $debt->fresh()->paid);
    }

    public function test_pending_and_failed_payments_never_count(): void
    {
        $debt = $this->makeDebt(100_000);
        $donor = User::factory()->create();
        $this->pay($debt, $donor, 30_000);
        $this->pay($debt, $donor, 70_000, Payment::PENDING);
        $this->pay($debt, $donor, 50_000, Payment::FAILED);

        $fresh = Debt::withPaid()->find($debt->id);
        $this->assertSame(30_000, $fresh->paid);
        $this->assertSame(70_000, $fresh->remaining);
        $this->assertSame(1, $fresh->payments_count);
        $this->assertSame('open', $fresh->phase);
        $this->assertTrue(Debt::open()->whereKey($debt->id)->exists(), 'pending money must not close a request');
        $this->assertSame(30_000, Payment::leaderboard()->first()['total']);
        $this->assertSame(3, Payment::withUnconfirmed()->count());
    }

    public function test_stages_follow_transfers_to_the_creditor_oldest_first(): void
    {
        $debt = $this->makeDebt(100_000);
        $donor = User::factory()->create();
        $first = $this->pay($debt, $donor, 40_000);
        $second = $this->pay($debt, $donor, 40_000);
        $pending = $this->pay($debt, $donor, 10_000, Payment::PENDING);
        $failed = $this->pay($debt, $donor, 10_000, Payment::FAILED);

        // ₮50,000 sent: covers the first donation fully, the second only partly.
        $debt->disbursements()->create([
            'user_id' => $donor->id, 'code' => Disbursement::newCode(), 'amount' => 50_000,
            'reference' => 'TX1', 'receipt_path' => 'r.pdf', 'paid_at' => now(),
        ]);

        $stages = Payment::stagesFor(Payment::withUnconfirmed()->get());
        $this->assertSame('sent', $stages[$first->id]);
        $this->assertSame('collected', $stages[$second->id]);
        $this->assertSame('pending', $stages[$pending->id]);
        $this->assertSame('failed', $stages[$failed->id]);
    }

    public function test_dashboard_lists_unconfirmed_payments_but_only_counts_paid_ones(): void
    {
        $debt = $this->makeDebt(100_000);
        $donor = User::factory()->create();
        $this->pay($debt, $donor, 30_000);
        $this->pay($debt, $donor, 20_000, Payment::PENDING);

        $this->actingAs($donor)->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('stats.given', 30_000)
            ->has('myPayments', 2)
            ->where('myPayments.0.stage', 'pending')
            ->where('myPayments.1.stage', 'collected'));
    }
}
