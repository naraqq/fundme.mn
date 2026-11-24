<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A disbursement = money fundme.mn actually sent to the creditor.
 * Each one has a public verification code anyone can look up.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disbursements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('debt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // admin who recorded it
            $table->string('code', 16)->unique();
            $table->unsignedBigInteger('amount');
            $table->string('reference', 100); // bank transaction number
            $table->string('receipt_path')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disbursements');
    }
};
