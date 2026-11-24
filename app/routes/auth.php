<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\PhoneLoginController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    // Phone (verify.mn) is the primary way in; email stays as a fallback.
    Route::get('login', [PhoneLoginController::class, 'create'])->name('login');
    Route::post('login/phone', [PhoneLoginController::class, 'start'])->middleware('throttle:6,1')->name('login.phone.start');
    Route::get('login/phone/status', [PhoneLoginController::class, 'status'])->middleware('throttle:60,1')->name('login.phone.status');
    Route::post('login/phone/complete', [PhoneLoginController::class, 'complete'])->name('login.phone.complete');
    Route::post('login/phone/cancel', [PhoneLoginController::class, 'cancel'])->name('login.phone.cancel');
    Route::get('login/phone/name', [PhoneLoginController::class, 'nameForm'])->name('login.phone.name');
    Route::post('login/phone/name', [PhoneLoginController::class, 'storeName'])->name('login.phone.name.store');

    Route::get('login/email', [AuthenticatedSessionController::class, 'create'])
        ->name('login.email');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');
});

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});

// verify.mn → us. Unauthenticated GET wake-up signal; the UUID makes it unguessable.
Route::get('verify-mn/callback/{verification}', [PhoneLoginController::class, 'callback'])
    ->middleware('throttle:30,1')
    ->name('verify-mn.callback');
