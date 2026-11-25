import { fmtDate, useT } from '@/lib/i18n';
import { mnt, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

const box = 'z-card p-6';

/** Problem 1: show *what* was checked and when, not just a badge. */
export function VerificationPanel({ debt }: { debt: Debt }) {
    const { t } = useT();

    if (debt.status === 'pending') {
        return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">⏳ {t('show.pendingNote')}</div>;
    }
    if (debt.status === 'rejected') {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {t('show.rejectedNote', { note: debt.verification_note ?? '' })}
            </div>
        );
    }
    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-emerald-700">🛡️ {t('show.verifyTitle')}</span>
                {debt.verified_at && <span className="text-mute text-xs">{t('show.verifiedOn', { date: fmtDate(debt.verified_at) })}</span>}
            </div>
            {debt.verification_note && <p className="text-ink/80 mt-2">{debt.verification_note}</p>}
        </div>
    );
}

/** Exactly how much came in, how much was sent to the person, and how much is still waiting. */
export function MoneyTrail({ debt }: { debt: Debt }) {
    const { t } = useT();
    const held = debt.paid - debt.disbursed;
    const rows: [string, number, string][] = [
        [t('show.collected'), debt.paid, 'bg-brand'],
        [t('show.sent'), debt.disbursed, 'bg-emerald-500'],
        [t('show.held'), held, 'bg-sky-400'],
        [t('show.needed'), debt.remaining, 'bg-line'],
    ];

    return (
        <div className={box}>
            <h2 className="mb-4 font-semibold">{t('show.trail')}</h2>
            {/* stacked bar: sent | held | still needed */}
            <div className="bg-line flex h-3 overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${(debt.disbursed / debt.amount) * 100}%` }} />
                <div className="bg-sky-400" style={{ width: `${(held / debt.amount) * 100}%` }} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
                {rows.map(([label, value, dot]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                        <dt className="text-mute flex items-center gap-2">
                            <span className={`size-2.5 rounded-full ${dot}`} />
                            {label}
                        </dt>
                        <dd className="font-semibold tabular-nums">{mnt(value)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/** Problem 5: a standard proof for every transfer — bank ref, receipt, public code. */
export function Receipts({ debt }: { debt: Debt }) {
    const { t } = useT();
    const list = debt.disbursements ?? [];

    return (
        <div className={box}>
            <h2 className="mb-3 font-semibold">🧾 {t('show.receipts')}</h2>
            {list.length === 0 && <p className="text-mute text-sm">{t('show.noReceipts')}</p>}
            <ul className="space-y-2">
                {list.map((r) => (
                    <li key={r.id} className="bg-panel-2 rounded-xl p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-emerald-700">{mnt(r.amount)}</span>
                            <span className="text-mute text-xs">{fmtDate(r.paid_at)}</span>
                        </div>
                        <div className="text-mute mt-1 text-xs">
                            → {debt.name} · {t('show.ref', { ref: r.reference })}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            <code className="bg-canvas rounded px-2 py-0.5 font-mono tracking-wider">{r.code}</code>
                            <Link href={route('verify', { code: r.code })} className="text-brand hover:text-brand-2">
                                {t('show.checkCode')} →
                            </Link>
                            {r.has_receipt && (
                                <a href={route('receipts.show', r.code)} target="_blank" className="text-mute hover:text-ink">
                                    {t('show.viewReceipt')}
                                </a>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

type Event = { at: string; icon: string; text: string; tone?: string };

export function Timeline({ debt }: { debt: Debt }) {
    const { t } = useT();
    const events: Event[] = [{ at: debt.created_at, icon: '📝', text: t('tl.posted') }];
    if (debt.verified_at) events.push({ at: debt.verified_at, icon: '🛡️', text: t('tl.verified'), tone: 'text-emerald-700' });
    for (const p of debt.payments ?? []) {
        events.push({ at: p.created_at, icon: '💛', text: t('tl.payment', { who: p.anonymous ? t('anonymous') : p.payer_name, amount: mnt(p.amount) }) });
    }
    for (const d of debt.disbursements ?? []) {
        events.push({ at: d.paid_at, icon: '🏦', text: t('tl.disbursed', { amount: mnt(d.amount), name: debt.name }), tone: 'text-emerald-700' });
    }
    events.sort((a, b) => a.at.localeCompare(b.at));
    if (debt.phase === 'settled') events.push({ at: events[events.length - 1].at, icon: '🎉', text: t('tl.settled'), tone: 'text-brand' });

    return (
        <div className={box}>
            <h2 className="mb-4 font-semibold">{t('show.timeline')}</h2>
            <ol className="border-line relative ml-2 space-y-4 border-l pl-5">
                {events.map((e, i) => (
                    <li key={i} className="relative text-sm">
                        <span className="bg-panel absolute top-0 -left-[31px] grid size-5 place-items-center text-xs">{e.icon}</span>
                        <div className={e.tone ?? ''}>{e.text}</div>
                        <div className="text-mute text-xs">{fmtDate(e.at)}</div>
                    </li>
                ))}
            </ol>
        </div>
    );
}
