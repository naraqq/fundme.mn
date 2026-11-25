<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\TransparencyController;
use App\Http\Controllers\UserProfileController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\SetLocale;
use Illuminate\Support\Facades\Route;

Route::post('locale/{locale}', function (string $locale) {
    session(['locale' => $locale]);

    return back();
})->whereIn('locale', SetLocale::SUPPORTED)->name('locale');

Route::get('/', [DebtController::class, 'home'])->name('home');
Route::get('discover', [DebtController::class, 'discover'])->name('discover');
Route::get('debts', [DebtController::class, 'index'])->name('debts.index');

// People: public profiles and the top-donor leaderboard.
Route::get('donors', [UserProfileController::class, 'donors'])->name('donors');
Route::get('companies', [UserProfileController::class, 'companies'])->name('companies');
Route::get('u/{user}', [UserProfileController::class, 'show'])->whereNumber('user')->name('users.show');

// Transparency: public ledger, receipt verification, receipt files.
Route::get('transparency', [TransparencyController::class, 'index'])->name('transparency');
Route::get('verify', [TransparencyController::class, 'verify'])->name('verify');
Route::get('receipts/{disbursement:code}', [TransparencyController::class, 'receipt'])->name('receipts.show');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DebtController::class, 'dashboard'])->name('dashboard');
    Route::get('debts/new', [DebtController::class, 'create'])->name('debts.create');
    Route::post('debts', [DebtController::class, 'store'])->middleware('throttle:5,60')->name('debts.store');
    Route::post('debts/{debt}/pay', [DebtController::class, 'pay'])->middleware('throttle:20,1')->name('debts.pay');
    Route::post('debts/{debt}/report', [DebtController::class, 'report'])->middleware('throttle:10,60')->name('debts.report');
    Route::post('u/{user}/follow', [UserProfileController::class, 'follow'])->middleware('throttle:60,1')->name('users.follow');
    Route::delete('u/{user}/follow', [UserProfileController::class, 'unfollow'])->middleware('throttle:60,1')->name('users.unfollow');
});

Route::middleware(['auth', EnsureAdmin::class])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminController::class, 'index'])->name('index');
    Route::get('debts/{debt}/bill', [AdminController::class, 'bill'])->name('bill');
    Route::post('debts/{debt}/review', [AdminController::class, 'review'])->name('review');
    Route::post('debts/{debt}/disburse', [AdminController::class, 'disburse'])->name('disburse');
    Route::post('debts/{debt}/reports/dismiss', [AdminController::class, 'dismissReports'])->name('reports.dismiss');
    Route::post('companies/{user}/verify', [AdminController::class, 'verifyCompany'])->name('companies.verify');
});

Route::get('debts/{debt}', [DebtController::class, 'show'])->name('debts.show');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
