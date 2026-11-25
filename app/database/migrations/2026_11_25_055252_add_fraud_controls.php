<?php

use App\Models\Debt;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fraud controls:
 * - bank account numbers encrypted at rest, plus a keyed fingerprint to spot the same account on other requests;
 * - requests can be paused (flagged) after enough reports;
 * - user reports;
 * - an audit log of admin actions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->text('bank_account')->nullable()->change(); // ciphertext is long
            $table->string('bank_account_hash', 64)->nullable()->index()->after('bank_account');
            $table->timestamp('flagged_at')->nullable()->after('verified_at'); // paused by reports, pending admin
        });

        // Encrypt existing plain-text account numbers and fingerprint them.
        DB::table('debts')->whereNotNull('bank_account')->orderBy('id')->each(function ($row) {
            DB::table('debts')->where('id', $row->id)->update([
                'bank_account' => Crypt::encryptString($row->bank_account),
                'bank_account_hash' => Debt::fingerprint($row->bank_account),
            ]);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('debt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reason', 24);
            $table->string('details', 500)->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->unique(['debt_id', 'user_id']); // one report per person per request
        });

        Schema::create('admin_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete(); // null = automatic
            $table->string('action', 32);
            $table->foreignId('debt_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // subject user, e.g. a company
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_actions');
        Schema::dropIfExists('reports');

        DB::table('debts')->whereNotNull('bank_account')->orderBy('id')->each(function ($row) {
            DB::table('debts')->where('id', $row->id)->update(['bank_account' => Crypt::decryptString($row->bank_account)]);
        });
        Schema::table('debts', function (Blueprint $table) {
            $table->dropIndex(['bank_account_hash']);
            $table->dropColumn(['bank_account_hash', 'flagged_at']);
        });
    }
};
