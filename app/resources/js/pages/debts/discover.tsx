import SwipeDeck from '@/components/zeel/swipe-deck';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, type Category, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type Props = {
    debts: Debt[];
    cat: Category | null;
    categories: Record<string, number>;
    total: number;
};

export default function Discover({ debts, cat, categories, total }: Props) {
    const { t } = useT();
    const active = (on: boolean) =>
        `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? 'border-brand bg-brand text-white' : 'border-line text-mute hover:text-ink bg-white'}`;

    return (
        <PublicLayout title={t('nav.discover')} wide>
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">{t('nav.discover')}</h1>
                    <p className="text-mute mt-1 text-sm">{t('disc.sub')}</p>
                </div>

                {/* Category filters */}
                <div className="mx-auto mt-5 flex max-w-2xl gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Link href={route('discover')} className={active(!cat)} preserveScroll>
                        {t('list.all')} {total}
                    </Link>
                    {CATEGORIES.filter((c) => categories[c.value]).map((c) => (
                        <Link key={c.value} href={route('discover', { cat: c.value })} className={active(cat === c.value)} preserveScroll>
                            {c.emoji} {t(`cat.${c.value}`)} {categories[c.value]}
                        </Link>
                    ))}
                </div>

                {debts.length === 0 ? (
                    <div className="border-line bg-panel mx-auto mt-10 max-w-sm rounded-2xl border p-8 text-center">
                        <div className="text-4xl">🔍</div>
                        <p className="text-mute mt-3 text-sm">{t('disc.noneCat')}</p>
                        <Link href={route('discover')} className="btn-brand mt-5">
                            {t('list.all')}
                        </Link>
                    </div>
                ) : (
                    <SwipeDeck key={cat ?? 'all'} debts={debts} />
                )}
            </div>
        </PublicLayout>
    );
}
