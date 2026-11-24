<?php

namespace App\Services;

use RuntimeException;

class VerifyMnException extends RuntimeException
{
    public function __construct(string $message, public readonly ?int $status = null)
    {
        parent::__construct($message);
    }
}
