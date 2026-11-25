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
    const chip = (on: boolean) =>
        `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${on ? 'bg-ink text-white' : 'text-mute hover:text-ink hover:bg-panel-2'}`;
    const count = (on: boolean) => `text-xs tabular-nums ${on ? 'text-white/70' : 'text-mute/70'}`;

    return (
        <PublicLayout title={t('nav.discover')} wide>
            <div className="mx-auto max-w-5xl px-4 py-10">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">{t('nav.discover')}</h1>
                    <p className="text-mute mt-2 text-[15px]">{t('disc.sub')}</p>
                </header>

                <nav className="border-line -mx-4 mt-6 flex gap-1 overflow-x-auto border-b px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Link href={route('discover')} className={chip(!cat)} preserveScroll>
                        {t('list.all')} <span className={count(!cat)}>{total}</span>
                    </Link>
                    {CATEGORIES.filter((c) => categories[c.value]).map((c) => (
                        <Link key={c.value} href={route('discover', { cat: c.value })} className={chip(cat === c.value)} preserveScroll>
                            {t(`cat.${c.value}`)} <span className={count(cat === c.value)}>{categories[c.value]}</span>
                        </Link>
                    ))}
                </nav>

                {debts.length === 0 ? (
                    <div className="border-line mx-auto mt-10 max-w-md rounded-2xl border border-dashed p-10 text-center">
                        <p className="text-mute">{t('disc.noneCat')}</p>
                        <Link href={route('discover')} className="btn-brand mt-5 !rounded-lg !px-4 !py-2 text-sm">
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
