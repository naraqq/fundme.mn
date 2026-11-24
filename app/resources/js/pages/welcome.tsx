import { DonorRow, MemberCount, UserAvatar, type BoardRow } from '@/components/zeel/people';
import { DebtCard, SmallBillCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, mnt, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type Props = {
    featured: Debt[];
    small: Debt[];
    stats: { paid: number; posted: number; cleared: number; sent: number; users: number; usersWeek: number };
    categories: Record<string, number>;
    topDonors: BoardRow[];
    topCompanies: BoardRow[];
};

export default function Welcome({ featured, small, stats, categories, topDonors, topCompanies }: Props) {
    const { t } = useT();
    const collage = featured.slice(0, 4);

    return (
        <PublicLayout title={t('home.title')} wide>
            {/* Hero */}
            <section className="from-brand-soft bg-gradient-to-b to-white">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
                    <div>
                        <div className="text-brand mb-4 text-sm font-bold tracking-wide uppercase">{t('home.eyebrow')}</div>
                        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">{t('home.h1')}</h1>
                        <p className="text-mute mt-5 max-w-lg text-lg">{t('home.sub2')}</p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={route('debts.create')} className="btn-brand px-7 py-3.5 text-base">
                                {t('home.ctaStart')}
                            </Link>
                            <Link href={route('discover')} className="btn-ghost px-6 py-3.5 text-base">
                                {t('home.ctaPay')}
                            </Link>
                        </div>
                        <p className="text-mute mt-6 text-sm">✓ {t('home.statLine', { amount: mnt(stats.sent) })}</p>
                        <div className="mt-3">
                            <MemberCount users={stats.users} usersWeek={stats.usersWeek} className="text-mute text-sm" />
                        </div>
                    </div>

                    {/* Collage of real fundraisers */}
                    <div className="relative hidden h-[380px] md:block">
                        {collage.map((d, i) => {
                            const pos = ['top-0 left-6 rotate-[-4deg]', 'top-6 right-0 rotate-[3deg]', 'bottom-0 left-0 rotate-[2deg]', 'right-8 bottom-4 rotate-[-2deg]'][i];
                            const pct = Math.round((d.paid / d.amount) * 100);
                            return (
                                <Link
                                    key={d.id}
                                    href={route('debts.show', d.id)}
                                    className={`z-card absolute w-56 p-3 transition hover:z-10 hover:scale-105 hover:rotate-0 ${pos}`}
                                >
                                    <div className="truncate text-sm font-bold">{d.title}</div>
                                    <div className="bg-brand-soft mt-2 h-1.5 overflow-hidden rounded-full">
                                        <div className="bg-brand h-full rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-mute mt-1.5 text-xs">{t('card.raised', { amount: mnt(d.paid) })}</div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4">
                {/* Stat strip */}
                <section className="border-line -mt-6 divide-line grid grid-cols-2 divide-x rounded-2xl border bg-white py-5 text-center shadow-sm sm:grid-cols-4">
                    {[
                        [stats.users.toLocaleString('en-US'), t('stat.users')],
                        [mnt(stats.paid), t('home.statPaid')],
                        [String(stats.posted), t('home.statPosted')],
                        [String(stats.cleared), t('home.statCleared')],
                    ].map(([v, l]) => (
                        <div key={l} className="px-2">
                            <div className="text-xl font-extrabold sm:text-3xl">{v}</div>
                            <div className="text-mute text-xs sm:text-sm">{l}</div>
                        </div>
                    ))}
                </section>

                {/* Small everyday bills — quick, complete wins */}
                {small.length > 0 && (
                    <section className="mt-16">
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                            <div>
                                <h2 className="text-2xl font-extrabold sm:text-3xl">⚡ {t('small.title')}</h2>
                                <p className="text-mute mt-1">{t('small.sub')}</p>
                            </div>
                            <Link href={route('debts.index', { small: 1, sort: 'small' })} className="text-brand hover:text-brand-2 text-sm font-semibold whitespace-nowrap">
                                {t('small.seeAll')}
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {small.map((d) => (
                                <SmallBillCard key={d.id} debt={d} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Fundraisers */}
                <section className="mt-16">
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <h2 className="text-2xl font-extrabold sm:text-3xl">{t('home.waiting')}</h2>
                        <Link href={route('debts.index')} className="text-brand hover:text-brand-2 text-sm font-semibold whitespace-nowrap">
                            {t('home.seeAll')}
                        </Link>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {featured.map((d) => (
                            <DebtCard key={d.id} debt={d} />
                        ))}
                    </div>
                </section>

                {/* Top donors */}
                {topDonors.length > 0 && (
                    <section className="mt-16">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <h2 className="text-2xl font-extrabold sm:text-3xl">🏆 {t('lb.title')}</h2>
                            <Link href={route('donors')} className="text-brand hover:text-brand-2 text-sm font-semibold whitespace-nowrap">
                                {t('lb.seeAll')}
                            </Link>
                        </div>
                        <ul className="z-card divide-line mx-auto max-w-2xl divide-y px-4">
                            {topDonors.map((row) => (
                                <DonorRow key={row.user.id} row={row} follow={false} />
                            ))}
                        </ul>
                    </section>
                )}

                {/* Companies helping */}
                {topCompanies.length > 0 && (
                    <section className="mt-16">
                        <div className="mb-6 flex items-end justify-between gap-4">
                            <h2 className="text-2xl font-extrabold sm:text-3xl">🏢 {t('co.title')}</h2>
                            <Link href={route('companies')} className="text-brand hover:text-brand-2 text-sm font-semibold whitespace-nowrap">
                                {t('co.seeAll')}
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            {topCompanies.map((row) => (
                                <Link
                                    key={row.user.id}
                                    href={route('users.show', row.user.id)}
                                    className="z-card hover:border-brand/40 flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5"
                                >
                                    <UserAvatar user={row.user} size={48} />
                                    <span className="line-clamp-1 text-sm font-bold">{row.user.name}</span>
                                    <span className="text-brand text-xs font-semibold">{mnt(row.total)}</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Categories */}
                <section className="mt-16">
                    <h2 className="mb-6 text-2xl font-extrabold sm:text-3xl">{t('home.catTitle')}</h2>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                        {CATEGORIES.map((c) => (
                            <Link
                                key={c.value}
                                href={route('debts.index', { cat: c.value })}
                                className="z-card hover:border-brand/40 flex flex-col items-center gap-1.5 px-2 py-4 text-center transition hover:-translate-y-0.5"
                            >
                                <span className="text-3xl">{c.emoji}</span>
                                <span className="text-xs leading-tight font-semibold sm:text-sm">{t(`cat.${c.value}`)}</span>
                                <span className="text-mute text-xs">{categories[c.value] ?? 0}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section className="mt-20">
                    <h2 className="mb-8 text-center text-2xl font-extrabold sm:text-3xl">{t('home.howTitle')}</h2>
                    <div className="grid gap-5 sm:grid-cols-3">
                        {(
                            [
                                ['1', 'home.s1t', 'home.s1d', '📝'],
                                ['2', 'home.s2t', 'home.s2d', '💙'],
                                ['3', 'home.s3t', 'home.s3d', '🏦'],
                            ] as const
                        ).map(([n, title, desc, icon]) => (
                            <div key={n} className="text-center">
                                <div className="bg-brand-soft mx-auto mb-4 grid size-16 place-items-center rounded-full text-3xl">{icon}</div>
                                <div className="text-brand text-sm font-bold">{n}</div>
                                <h3 className="mt-1 text-lg font-bold">{t(title)}</h3>
                                <p className="text-mute mx-auto mt-2 max-w-xs text-sm">{t(desc)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trust */}
                <section className="bg-brand mt-20 grid items-center gap-8 overflow-hidden rounded-3xl p-8 text-white sm:p-12 md:grid-cols-[1fr_1.2fr]">
                    <div>
                        <div className="text-5xl">🛡️</div>
                        <h2 className="mt-4 text-3xl font-extrabold">{t('home.trustTitle')}</h2>
                        <Link href={route('guarantee')} className="text-brand mt-6 inline-flex rounded-full bg-white px-6 py-3 font-semibold hover:bg-white/90">
                            {t('home.trustCta')} →
                        </Link>
                    </div>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {(['home.trust1', 'home.trust2', 'home.trust3', 'home.trust4'] as const).map((k) => (
                            <li key={k} className="rounded-2xl bg-white/10 p-4 text-sm leading-snug font-medium">
                                ✓ {t(k)}
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </PublicLayout>
    );
}
