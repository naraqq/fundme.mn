import { useT } from '@/lib/i18n';
import { mnt, type Debt, type PaymentStage } from '@/lib/zeel';
import { Check, Clock, X } from 'lucide-react';

const STEPS = ['review', 'collecting', 'collected', 'sent'] as const;

/** Index of the request's current step (rejected requests don't show progress). */
function stepOf(debt: Debt): number {
    switch (debt.phase) {
        case 'pending':
            return 0;
        case 'open':
            return 1;
        case 'funded':
            return 2;
        default:
            return 3;
    }
}

/**
 * Where a request stands: Under review → Collecting → Fully collected → Paid out,
 * plus one sentence explaining the current step in money terms.
 */
export function RequestProgress({ debt, compact = false }: { debt: Debt; compact?: boolean }) {
    const { t } = useT();
    if (debt.phase === 'rejected') return null;

    const current = stepOf(debt);
    const done = debt.phase === 'settled';
    const vars = { paid: mnt(debt.paid), amount: mnt(debt.amount), name: debt.name };
    const detail = t(`st.${STEPS[current]}D`, vars);
    // Money can be sent in parts before everything is collected.
    const partSent = !done && debt.disbursed > 0 ? t('st.partSent', { amount: mnt(debt.disbursed), name: debt.name }) : null;

    return (
        <div className={compact ? '' : 'border-line rounded-xl border bg-white p-5'}>
            {!compact && <h2 className="mb-4 font-semibold">{t('st.title')}</h2>}
            {/* Four Mongolian labels don't fit side by side on a phone: show the current step instead. */}
            <p className="mb-2 text-xs font-medium sm:hidden">
                <span className="text-mute">{t('st.step', { i: current + 1, n: STEPS.length })} · </span>
                {done ? t('st.sent') : t(`st.${STEPS[current]}`)}
            </p>
            <ol className="grid grid-cols-4 gap-2">
                {STEPS.map((step, i) => {
                    const complete = i < current || done;
                    const active = i === current && !done;
                    return (
                        <li key={step} className="min-w-0">
                            <div className={`h-1.5 rounded-full ${complete ? 'bg-emerald-500' : active ? 'bg-brand' : 'bg-line'}`} />
                            <div
                                className={`mt-2 flex items-start gap-1 text-xs leading-tight font-medium max-sm:hidden ${complete ? 'text-emerald-700' : active ? 'text-ink' : 'text-mute'}`}
                            >
                                {complete && <Check className="mt-px size-3 shrink-0" aria-hidden />}
                                <span className="min-w-0">{t(complete && step === 'review' ? 'st.reviewDone' : `st.${step}`)}</span>
                            </div>
                        </li>
                    );
                })}
            </ol>
            <p className={`text-mute leading-relaxed ${compact ? 'mt-2 text-xs' : 'mt-4 text-sm'}`}>
                {compact && <b className="text-ink font-medium">{t(`st.${STEPS[current]}`)}: </b>}
                {detail}
                {partSent && <> {partSent}</>}
            </p>
        </div>
    );
}

const STAGE_STYLE: Record<PaymentStage, string> = {
    pending: 'bg-amber-50 text-amber-800 ring-amber-200',
    failed: 'bg-rose-50 text-rose-700 ring-rose-200',
    collected: 'bg-sky-50 text-sky-800 ring-sky-200',
    sent: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

/** Donor-facing label for one donation: Payment pending / Collected / Paid out / Not completed. */
export function PaymentStageBadge({ stage }: { stage: PaymentStage }) {
    const { t } = useT();
    const Icon = stage === 'sent' ? Check : stage === 'failed' ? X : stage === 'pending' ? Clock : null;
    return (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${STAGE_STYLE[stage]}`} title={t(`ps.${stage}D`)}>
            {Icon && <Icon className="size-3" aria-hidden />}
            {t(`ps.${stage}`)}
        </span>
    );
}
