import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type LedgerRow = {
    type: 'in' | 'out';
    id: number;
    at: string;
    amount: number;
    who?: string | null;
    code?: string;
    debt: { id: number; name: string } | null;
};

type Props = {
    totals: { collected: number; sent: number; held: number; verified: number; settled: number; patrons: number };
    ledger: LedgerRow[];
};

export default function Transparency({ totals, ledger }: Props) {
    const { t } = useT();
    const tiles: [string, string, string][] = [
        [t('tr.collected'), mnt(totals.collected), 'text-brand'],
        [t('tr.sent'), mnt(totals.sent), 'text-emerald-700'],
        [t('tr.held'), mnt(totals.held), 'text-sky-700'],
        [t('tr.verified'), String(totals.verified), ''],
        [t('tr.settled'), String(totals.settled), ''],
        [t('tr.patrons'), String(totals.patrons), ''],
    ];

    return (
        <PublicLayout title={t('nav.transparency')}>
            <div className="py-10">
                <h1 className="text-3xl font-bold">{t('nav.transparency')}</h1>
                <p className="text-mute mt-1">{t('tr.sub')}</p>

                <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {tiles.map(([label, value, tone]) => (
                        <div key={label} className="border-line bg-panel min-w-0 rounded-2xl border p-3.5 sm:p-4">
                            <div className={`text-base font-bold tabular-nums min-[360px]:text-lg min-[400px]:text-xl sm:text-2xl ${tone}`}>{value}</div>
                            <div className="text-mute text-xs">{label}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="border-line bg-panel rounded-3xl border p-6">
                        <h2 className="mb-4 font-semibold">{t('tr.ledger')}</h2>
                        {ledger.length === 0 && <p className="text-mute text-sm">{t('tr.empty')}</p>}
                        <ul className="divide-line divide-y">
                            {ledger.map((r) => (
                                <li key={`${r.type}-${r.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                                    <span
                                        className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs ${r.type === 'in' ? 'bg-brand/15 text-brand' : 'bg-emerald-50 text-emerald-700'}`}
                                    >
                                        {r.type === 'in' ? t('tr.in') : t('tr.out')}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        {r.debt ? (
                                            <Link href={route('debts.show', r.debt.id)} className="hover:text-brand-2 block truncate">
                                                {r.type === 'in'
                                                    ? t('tr.inLine', { who: r.who ?? t('anonymous'), name: r.debt.name })
                                                    : t('tr.outLine', { name: r.debt.name })}
                                            </Link>
                                        ) : (
                                            <span className="text-mute">—</span>
                                        )}
                                        <div className="text-mute text-xs">
                                            {fmtDate(r.at)}
                                            {r.code && (
                                                <>
                                                    {' · '}
                                                    <Link href={route('verify', { code: r.code })} className="font-mono hover:underline">
                                                        {r.code}
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className="shrink-0 font-semibold tabular-nums">
                                        {r.type === 'in' ? '+' : '−'}
                                        {mnt(r.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <aside className="border-line bg-panel h-fit rounded-3xl border p-6">
                        <h2 className="mb-4 font-semibold">{t('tr.howTitle')}</h2>
                        <ol className="space-y-3 text-sm">
                            {(['tr.how1', 'tr.how2', 'tr.how3'] as const).map((k, i) => (
                                <li key={k} className="flex gap-3">
                                    <span className="bg-brand grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white">{i + 1}</span>
                                    <span className="text-ink/85">{t(k)}</span>
                                </li>
                            ))}
                        </ol>
                        <Link href={route('verify')} className="btn-ghost mt-6 w-full text-sm">
                            🔎 {t('nav.verify')}
                        </Link>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}
