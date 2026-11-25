import { DebtCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, type Debt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Sort = 'new' | 'small' | 'close';
type Filters = { cat: string | null; sort: Sort; small: boolean; q: string; open: boolean };
const SORTS = { new: 'list.new', small: 'list.small', close: 'list.close' } as const;

export default function DebtsIndex({
    debts,
    counts,
    total,
    filters,
}: {
    debts: Debt[];
    counts: Record<string, number>;
    total: number;
    filters: Filters;
}) {
    const { t } = useT();
    const [q, setQ] = useState(filters.q);

    // Build the URL for a change, keeping the other filters; defaults are left out to keep links short.
    const params = (p: Partial<Filters>) => {
        const f = { ...filters, ...p };
        return {
            ...(f.cat ? { cat: f.cat } : {}),
            ...(f.sort !== 'new' ? { sort: f.sort } : {}),
            ...(f.small ? { small: 1 } : {}),
            ...(f.open ? { open: 1 } : {}),
            ...(f.q ? { q: f.q } : {}),
        };
    };
    const go = (p: Partial<Filters>) => router.get(route('debts.index'), params(p), { preserveState: true, preserveScroll: true, replace: true });

    // Search as you type, after a short pause.
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const id = setTimeout(() => go({ q: q.trim() }), 350);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const anyFilter = !!(filters.cat || filters.small || filters.open || filters.q || filters.sort !== 'new');
    const tab = (on: boolean) =>
        `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${on ? 'bg-ink text-white' : 'text-mute hover:text-ink hover:bg-panel-2'}`;
    const count = (on: boolean) => `text-xs tabular-nums ${on ? 'text-white/70' : 'text-mute/70'}`;

    return (
        <PublicLayout title={t('nav.all')}>
            <div className="py-10">
                <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('nav.all')}</h1>
                        <p className="text-mute mt-1 text-sm">{t('list.results', { n: debts.length })}</p>
                    </div>
                    {anyFilter && (
                        <Link href={route('debts.index')} className="text-mute hover:text-ink inline-flex items-center gap-1 text-sm" preserveScroll>
                            <X className="size-4" aria-hidden /> {t('list.clear')}
                        </Link>
                    )}
                </header>

                <div className="border-line mt-6 rounded-xl border bg-white">
                    {/* Search */}
                    <label className="border-line flex items-center gap-2.5 border-b px-4">
                        <Search className="text-mute size-4 shrink-0" aria-hidden />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t('list.search')}
                            className="placeholder:text-mute/70 w-full bg-transparent py-3 text-[15px] outline-none"
                        />
                    </label>

                    {/* Categories */}
                    <nav className="border-line flex gap-1 overflow-x-auto border-b px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button type="button" onClick={() => go({ cat: null })} className={tab(!filters.cat)}>
                            {t('list.all')} <span className={count(!filters.cat)}>{total}</span>
                        </button>
                        {CATEGORIES.filter((c) => counts[c.value] || filters.cat === c.value).map((c) => (
                            <button key={c.value} type="button" onClick={() => go({ cat: c.value })} className={tab(filters.cat === c.value)}>
                                {t(`cat.${c.value}`)} <span className={count(filters.cat === c.value)}>{counts[c.value] ?? 0}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Toggles + sort */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
                        <Toggle on={filters.small} onChange={(v) => go({ small: v })}>
                            {t('small.chip')}
                        </Toggle>
                        <Toggle on={filters.open} onChange={(v) => go({ open: v })}>
                            {t('list.open')}
                        </Toggle>
                        <label className="text-mute ml-auto flex items-center gap-2 text-sm">
                            {t('list.sort')}
                            <select
                                value={filters.sort}
                                onChange={(e) => go({ sort: e.target.value as Sort })}
                                className="border-line text-ink rounded-lg border bg-white py-1.5 pr-8 pl-3 text-sm font-medium"
                            >
                                {(Object.keys(SORTS) as Sort[]).map((k) => (
                                    <option key={k} value={k}>
                                        {t(SORTS[k])}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {debts.length === 0 ? (
                    <div className="border-line mt-8 rounded-xl border border-dashed p-12 text-center">
                        <p className="text-mute">{t('list.none')}</p>
                        {anyFilter && (
                            <Link href={route('debts.index')} className="btn-ghost mt-4 !rounded-lg !px-4 !py-2 text-sm">
                                {t('list.clear')}
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {debts.map((d) => (
                            <DebtCard key={d.id} debt={d} />
                        ))}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}

/** A small on/off switch with a label. */
function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="text-ink inline-flex items-center gap-2.5 text-sm font-medium">
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-line'}`}>
                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            {children}
        </button>
    );
}
