<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Resolved lazily, so a missing VERIFY_MN_API_KEY fails loudly the first time it's used.
        $this->app->singleton(\App\Services\VerifyMn::class, fn () => \App\Services\VerifyMn::fromConfig());
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
