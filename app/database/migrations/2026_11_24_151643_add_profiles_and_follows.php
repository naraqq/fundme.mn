<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('bio', 160)->nullable();
            $table->string('city', 60)->nullable();
        });

        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('followed_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['follower_id', 'followed_id']);
            $table->index('followed_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follows');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['bio', 'city']));
    }
};
