<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Payload for a one-time toast on the next page: `back()->with('toast', $this->toast('toast.paid', [...]))`.
     * `key` is an i18n key in resources/js/lib/i18n.ts; `vars` fill its {placeholders}.
     * Money vars are sent as raw integers and formatted client-side (see MONEY_VARS in flash-toaster.tsx).
     */
    protected function toast(string $key, array $vars = [], string $type = 'success', ?string $description = null): array
    {
        return ['type' => $type, 'key' => $key, 'vars' => $vars, 'description' => $description, 'id' => (string) str()->uuid()];
    }
}
