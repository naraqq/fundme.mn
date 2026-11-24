import { DebtCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type Sort = 'new' | 'small' | 'close';
const SORTS = { new: 'list.new', small: 'list.small', close: 'list.close' } as const;

export default function DebtsIndex({ debts, filters }: { debts: Debt[]; filters: { cat: string | null; sort: Sort; small: boolean } }) {
    const { t } = useT();
    const href = (p: { cat?: string | null; sort?: Sort; small?: boolean }) => {
        const cat = 'cat' in p ? p.cat : filters.cat;
        const sort = p.sort ?? filters.sort;
        const small = p.small ?? filters.small;
        return route('debts.index', { ...(cat ? { cat } : {}), ...(sort !== 'new' ? { sort } : {}), ...(small ? { small: 1 } : {}) });
    };
    const chip = (active: boolean) =>
        `rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-brand bg-brand/10 text-brand' : 'border-line text-mute hover:text-ink'}`;

    return (
        <PublicLayout title={t('nav.all')}>
            <div className="py-10">
                <h1 className="text-3xl font-bold">{t('nav.all')}</h1>
                <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                        href={href({ small: !filters.small })}
                        className={`${chip(filters.small)} font-semibold`}
                        preserveScroll
                    >
                        ⚡ {t('small.chip')}
                    </Link>
                    <Link href={href({ cat: null })} className={chip(!filters.cat)} preserveScroll>
                        {t('list.all')}
                    </Link>
                    {CATEGORIES.map((c) => (
                        <Link key={c.value} href={href({ cat: c.value })} className={chip(filters.cat === c.value)} preserveScroll>
                            {c.emoji} {t(`cat.${c.value}`)}
                        </Link>
                    ))}
                </div>
                <div className="text-mute mt-3 flex flex-wrap gap-4 text-sm">
                    {t('list.sort')}
                    {(Object.keys(SORTS) as Sort[]).map((k) => (
                        <Link
                            key={k}
                            href={href({ sort: k })}
                            className={filters.sort === k ? 'text-ink underline' : 'hover:text-ink'}
                            preserveScroll
                        >
                            {t(SORTS[k])}
                        </Link>
                    ))}
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {debts.map((d) => (
                        <DebtCard key={d.id} debt={d} />
                    ))}
                </div>
                {debts.length === 0 && <p className="text-mute mt-10">{t('list.empty')}</p>}
            </div>
        </PublicLayout>
    );
}
