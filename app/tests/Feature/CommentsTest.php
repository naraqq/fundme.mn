<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Debt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentsTest extends TestCase
{
    use RefreshDatabase;

    private function makeDebt(User $owner, string $status = 'verified'): Debt
    {
        return $owner->debts()->create([
            'name' => 'Bat', 'city' => 'UB', 'title' => 'Car loan', 'story' => str_repeat('x', 50),
            'category' => 'loan', 'amount' => 500_000, 'color' => 'amber', 'status' => $status,
            'verified_at' => $status === 'verified' ? now() : null,
        ]);
    }

    private function admin(): User
    {
        return tap(User::factory()->create())->forceFill(['is_admin' => true])->save() ? User::latest('id')->first() : null;
    }

    public function test_signed_in_users_can_comment_and_guests_cannot(): void
    {
        $debt = $this->makeDebt(User::factory()->create());

        $this->post("/debts/{$debt->id}/comments", ['body' => 'Stay strong!'])->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->post("/debts/{$debt->id}/comments", ['body' => 'Stay strong!'])->assertSessionHasNoErrors();

        $this->assertSame(['Stay strong!'], Comment::pluck('body')->all());
    }

    public function test_links_and_long_numbers_are_blocked(): void
    {
        $debt = $this->makeDebt(User::factory()->create());
        $user = User::factory()->create();

        foreach (['Send to 5000 1234 56 directly', 'call 99112233', 'see https://bit.ly/x', 'go to scam.mn now', 'www.example.com'] as $bait) {
            $this->actingAs($user)->post("/debts/{$debt->id}/comments", ['body' => $bait])->assertSessionHasErrors('body');
        }
        // Ordinary numbers are fine.
        $this->actingAs($user)->post("/debts/{$debt->id}/comments", ['body' => 'Gave ₮20,000, good luck in 2026!'])->assertSessionHasNoErrors();
        $this->assertSame(1, Comment::count());
    }

    public function test_no_comments_on_requests_that_are_not_live(): void
    {
        $user = User::factory()->create();
        $pending = $this->makeDebt(User::factory()->create(), 'pending');
        $paused = $this->makeDebt(User::factory()->create());
        $paused->forceFill(['flagged_at' => now()])->save();

        $this->actingAs($user)->post("/debts/{$pending->id}/comments", ['body' => 'Hi there'])->assertNotFound();
        $this->actingAs($user)->post("/debts/{$paused->id}/comments", ['body' => 'Hi there'])->assertNotFound();
    }

    public function test_requester_and_donors_are_labelled(): void
    {
        $owner = User::factory()->create();
        $donor = User::factory()->create();
        $debt = $this->makeDebt($owner);
        $debt->payments()->create(['user_id' => $donor->id, 'payer_name' => $donor->name, 'anonymous' => false, 'amount' => 5000]);

        foreach ([$owner, $donor, User::factory()->create()] as $u) {
            $this->actingAs($u)->post("/debts/{$debt->id}/comments", ['body' => "Hello from {$u->id}"]);
        }

        $this->get("/debts/{$debt->id}")->assertInertia(fn ($p) => $p
            ->has('comments', 3)
            ->where('comments', fn ($c) => collect($c)->pluck('role')->sort()->values()->all() === [null, 'donor', 'owner']));
    }

    public function test_profile_lists_their_comments_on_public_requests_only(): void
    {
        $author = User::factory()->create();
        $live = $this->makeDebt(User::factory()->create());
        $paused = $this->makeDebt(User::factory()->create());
        $live->comments()->create(['user_id' => $author->id, 'body' => 'Visible one']);
        $paused->comments()->create(['user_id' => $author->id, 'body' => 'Hidden one']);
        $paused->forceFill(['flagged_at' => now()])->save();

        $this->get("/u/{$author->id}")->assertInertia(fn ($p) => $p
            ->has('comments', 1)
            ->where('comments.0.body', 'Visible one')
            ->where('comments.0.debt.id', $live->id));
    }

    public function test_only_author_or_admin_can_delete_and_admin_removal_is_logged(): void
    {
        $owner = User::factory()->create();
        $author = User::factory()->create();
        $debt = $this->makeDebt($owner);
        $comment = $debt->comments()->create(['user_id' => $author->id, 'body' => 'This looks fake']);

        // The requester can't hide criticism; strangers can't either.
        $this->actingAs($owner)->delete("/comments/{$comment->id}")->assertForbidden();
        $this->actingAs(User::factory()->create())->delete("/comments/{$comment->id}")->assertForbidden();

        $this->actingAs($this->admin())->delete("/comments/{$comment->id}")->assertRedirect();
        $this->assertSame(0, Comment::count());
        $this->assertDatabaseHas('admin_actions', ['action' => 'comment_removed', 'debt_id' => $debt->id, 'user_id' => $author->id]);

        $own = $debt->comments()->create(['user_id' => $author->id, 'body' => 'oops']);
        $this->actingAs($author)->delete("/comments/{$own->id}")->assertRedirect();
        $this->assertSame(0, Comment::count());
        $this->assertSame(1, \App\Models\AdminAction::count(), 'deleting your own comment is not an admin action');
    }
}
