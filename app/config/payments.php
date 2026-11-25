<?php

return [
    /*
     * Payment-provider (QPay) commission, in percent, added on top of the donation and paid by the donor.
     * The request always receives the full donation amount. Set it to your QPay contract rate.
     */
    'fee_percent' => (float) env('PAYMENT_FEE_PERCENT', 1.0),

    /*
     * Banks a requester can receive the collected donations at (shown as a list on the request form).
     */
    'banks' => [
        'Хаан банк',
        'Голомт банк',
        'Худалдаа хөгжлийн банк',
        'Хас банк',
        'Төрийн банк',
        'Капитрон банк',
        'Богд банк',
        'Ариг банк',
        'Транс банк',
        'Үндэсний хөрөнгө оруулалтын банк',
        'М банк',
        'Чингис хаан банк',
    ],
];
