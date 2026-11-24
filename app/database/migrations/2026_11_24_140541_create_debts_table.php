<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('city');
            $table->string('title', 70);
            $table->text('story');
            $table->string('category', 20)->index();
            $table->string('creditor');
            $table->unsignedBigInteger('amount'); // MNT, whole tugriks
            $table->string('photo_path')->nullable(); // public cover photo
            $table->string('photo_credit')->nullable(); // e.g. "Chinneeb · CC BY 4.0" for licensed photos
            $table->string('photo_credit_url')->nullable();
            $table->string('bill_path')->nullable(); // private: only admins can open it
            $table->string('status', 20)->default('pending')->index(); // pending | verified | rejected
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_note', 300)->nullable(); // shown publicly
            $table->string('color', 20)->default('amber');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debts');
    }
};
