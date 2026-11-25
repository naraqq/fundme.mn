import { translate } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { type FlashToast, type SharedData } from '@/types';
import { type Page } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

// Vars the server sends as raw integers that should display as money.
const MONEY_VARS = new Set(['amount']);

// A flash can be seen twice (initial page + React StrictMode, or a replayed visit); show each one once.
const shown = new Set<string>();

function show(page: Page) {
    const props = page.props as unknown as SharedData;
    const payload: FlashToast | null | undefined = props.flash?.toast;
    if (!payload || shown.has(payload.id)) return;
    shown.add(payload.id);

    const vars = Object.fromEntries(
        Object.entries(payload.vars ?? {}).map(([k, v]) => [k, MONEY_VARS.has(k) && typeof v === 'number' ? mnt(v) : v]),
    );
    const title = translate(props.locale, payload.key, vars);
    const description = payload.description ? translate(props.locale, payload.description, vars) : undefined;
    // Longer messages (payment thank-yous) stay up long enough to read.
    const duration = description ? 7000 : 4000;

    const fn = payload.type === 'error' ? toast.error : payload.type === 'info' ? toast.info : toast.success;
    fn(title, { id: payload.id, description, duration });
}

/** App-wide toaster. Shows whatever `toast` the server flashed, on first load and after every Inertia visit. */
export default function FlashToaster({ initialPage }: { initialPage: Page }) {
    useEffect(() => {
        show(initialPage);
        return router.on('success', (event) => show(event.detail.page));
    }, [initialPage]);

    return (
        <Toaster
            position="top-center"
            offset={76}
            mobileOffset={{ top: 72 }}
            richColors
            closeButton
            toastOptions={{
                className: '!rounded-xl !font-sans',
                classNames: { title: '!text-sm !font-semibold' },
                descriptionClassName: '!text-[13px] !leading-snug !opacity-90',
            }}
        />
    );
}
