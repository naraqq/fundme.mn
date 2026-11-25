<?php

return [
    // Accounts younger than this many days count as "new".
    'new_account_days' => (int) env('FRAUD_NEW_ACCOUNT_DAYS', 7),

    // New accounts can't ask for more than this (₮) until they've been around a while.
    'new_account_max' => (int) env('FRAUD_NEW_ACCOUNT_MAX', 1_000_000),

    // This many reports from different people pause a request until an admin reviews it.
    'auto_pause_reports' => (int) env('FRAUD_AUTO_PAUSE_REPORTS', 3),

    // Reasons a user can pick when reporting a request.
    'report_reasons' => ['scam', 'fake_story', 'wrong_person', 'duplicate', 'other'],
];
