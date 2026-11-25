<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // pending (waiting for QPay) → paid; or failed. Only `paid` rows count anywhere.
            $table->string('status', 16)->default('paid')->index()->after('amount');
            // Payment-provider commission charged to the donor on top of `amount` (which goes to the request in full).
            $table->unsignedBigInteger('fee')->default(0)->after('amount');
            $table->timestamp('paid_at')->nullable()->after('status');
        });

        // Everything recorded before this migration was an instant (demo) payment.
        DB::table('payments')->whereNull('paid_at')->update(['paid_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'fee', 'paid_at']);
        });
    }
};
