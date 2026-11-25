import { useT, type TKey } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Flag } from 'lucide-react';
import { useState } from 'react';

/**
 * "Report this request": quiet by default, a short form when opened.
 * Enough reports from different people pause the request until an admin reviews it.
 */
export default function ReportRequest({ debtId, reasons, reported }: { debtId: number; reasons: string[]; reported: boolean }) {
    const { t } = useT();
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const form = useForm({ reason: '', details: '' });

    if (reported) {
        return <p className="text-mute mt-4 flex items-center gap-1.5 text-xs">{t('rep.done')}</p>;
    }

    if (!open) {
        const trigger = (
            <span className="text-mute hover:text-ink inline-flex items-center gap-1.5 text-xs">
                <Flag className="size-3.5" aria-hidden /> {t('rep.link')}
            </span>
        );
        return (
            <div className="mt-4">
                {auth.user ? (
                    <button type="button" onClick={() => setOpen(true)}>
                        {trigger}
                    </button>
                ) : (
                    <Link href={route('login')}>{trigger}</Link>
                )}
            </div>
        );
    }

    return (
        <form
            className="border-line mt-4 space-y-3 rounded-xl border bg-white p-4"
            onSubmit={(e) => {
                e.preventDefault();
                form.post(route('debts.report', debtId), { preserveScroll: true });
            }}
        >
            <div>
                <h3 className="text-sm font-semibold">{t('rep.title')}</h3>
                <p className="text-mute mt-0.5 text-xs">{t('rep.sub')}</p>
            </div>
            <div className="space-y-1.5">
                {reasons.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                        <input type="radio" name="reason" value={r} checked={form.data.reason === r} onChange={() => form.setData('reason', r)} required />
                        {t(`rep.r.${r}` as TKey)}
                    </label>
                ))}
            </div>
            <textarea
                className="z-input min-h-16 text-sm"
                placeholder={t('rep.detailsPh')}
                maxLength={500}
                value={form.data.details}
                onChange={(e) => form.setData('details', e.target.value)}
            />
            {(form.errors.reason || form.errors.details) && <p className="text-sm text-rose-600">{form.errors.reason || form.errors.details}</p>}
            <div className="flex gap-2">
                <button disabled={form.processing || !form.data.reason} className="btn-brand !rounded-lg !px-4 !py-2 text-sm">
                    {t('rep.send')}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost !rounded-lg !px-4 !py-2 text-sm">
                    {t('set.cancel')}
                </button>
            </div>
        </form>
    );
}
