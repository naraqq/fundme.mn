<?php

namespace App\Http\Controllers;

use App\Models\AdminAction;
use App\Models\Comment;
use App\Models\Debt;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function store(Request $request, Debt $debt): RedirectResponse
    {
        // Only live requests take comments (not ones under review, rejected, or paused by reports).
        abort_unless($debt->acceptsMoney(), 404);

        $data = $request->validate(['body' => ['required', 'string', 'min:2', 'max:500']]);
        $body = trim($data['body']);

        if (Comment::looksLikePaymentBait($body)) {
            return back()->withErrors(['body' => __('Comments can’t include links, account or phone numbers. All help goes through fundme.mn.')]);
        }

        $debt->comments()->create(['user_id' => $request->user()->id, 'body' => $body]);

        return back()->with('toast', $this->toast('toast.commented'));
    }

    /** Authors can delete their own comments; admins can remove any (logged). Requesters can't hide others' comments. */
    public function destroy(Request $request, Comment $comment): RedirectResponse
    {
        $user = $request->user();
        $isAuthor = $comment->user_id === $user->id;
        abort_unless($isAuthor || $user->is_admin, 403);

        if (! $isAuthor) {
            AdminAction::log('comment_removed', $comment->debt, $comment->user, ['body' => mb_substr($comment->body, 0, 140)]);
        }
        $comment->delete();

        return back()->with('toast', $this->toast('toast.commentDeleted', type: 'info'));
    }
}
