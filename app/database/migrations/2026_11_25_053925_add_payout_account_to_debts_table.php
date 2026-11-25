<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trust model: fundme.mn collects donations and sends them to the requester's own bank account
 * (there is usually no invoice or creditor to pay). The account is admin-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->string('bank_name', 60)->nullable()->after('amount');
            $table->string('bank_account', 40)->nullable()->after('bank_name');
            $table->string('account_holder', 80)->nullable()->after('bank_account');
            // No longer asked for; kept for older requests.
            $table->string('creditor')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account', 'account_holder']);
        });
    }
};
