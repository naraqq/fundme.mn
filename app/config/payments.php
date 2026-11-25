<?php

return [
    /*
     * Payment-provider (QPay) commission, in percent, added on top of the donation and paid by the donor.
     * The request always receives the full donation amount. Set it to your QPay contract rate.
     */
    'fee_percent' => (float) env('PAYMENT_FEE_PERCENT', 1.0),
];
