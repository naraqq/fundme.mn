<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per verify.mn session (one SMS code). Linked to the browser session
 * that started it, and to the user once login completes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary(); // unguessable: also used in the callback URL
            $table->string('phone', 16)->index();
            $table->string('code', 6); // the SMS text the user must send
            $table->string('session_id')->nullable()->unique(); // verify.mn sessionId
            $table->string('status', 10)->default('PENDING'); // PENDING | VERIFIED | EXPIRED
            $table->string('sms_uri')->nullable();
            $table->text('display_instruction')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('consumed_at')->nullable(); // used for a login — can't be reused
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_verifications');
    }
};
