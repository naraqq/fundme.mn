import { NameWithBadge, UserAvatar, type BoardRow } from '@/components/zeel/people';
import { MiniDeck } from '@/components/zeel/swipe-deck';
import WelcomeSwipe from '@/components/zeel/welcome-swipe';
import { Bar, Cover, DebtCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, catOf, mnt, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BadgeCheck, FileCheck2, Heart, HandHeart, Landmark, MapPin, ReceiptText, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type Props = {
    featured: Debt[];
    small: Debt[];
    deck: Debt[];
    stats: { paid: number; posted: number; cleared: number; sent: number; users: number; usersWeek: number };
    categories: Record<string, number>;
    topDonors: BoardRow[];
    topCompanies: BoardRow[];
};

const n = (v: number) => v.toLocaleString('en-US');

export default function Welcome({ featured, small, deck, stats, categories, topDonors, topCompanies }: Props) {
    const { t } = useT();
    const spotlight = featured[0];

    return (
        <PublicLayout title={t('home.title')} wide>
            <WelcomeSwipe debts={deck} />
            {/* Hero: what this is, in plain words, next to a real request */}
            <section className="border-line border-b">
                <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
                    <div>
                        <p className="text-brand text-sm font-semibold">{t('home.eyebrow')}</p>
                        <h1 className="mt-3 text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl">{t('home.h1')}</h1>
                        <p className="text-mute mt-5 max-w-xl text-[17px] leading-relaxed">{t('home.lead')}</p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={route('debts.create')} className="btn-brand !rounded-xl !px-6 !py-3">
                                {t('home.ctaStart')}
                            </Link>
                            <Link href={route('discover')} className="btn-ghost !rounded-xl !px-6 !py-3">
                                {t('home.ctaPay').replace(/\s*→$/, '')}
                            </Link>
                        </div>
                        <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                            <Point icon={FileCheck2}>{t('home.pt1')}</Point>
                            <Point icon={Landmark}>{t('home.pt2')}</Point>
                            <Point icon={ReceiptText}>{t('home.pt3')}</Point>
                        </ul>
                    </div>

                    {spotlight && <Spotlight debt={spotlight} />}
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4">
                {/* Numbers */}
                <dl className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {/* Phones: the money total and the member count get full rows; long numbers don't fit half a phone. */}
                    <Stat label={t('home.statPaid')} value={mnt(stats.paid)} className="max-lg:col-span-2" />
                    <Stat label={t('home.statPosted')} value={n(stats.posted)} />
                    <Stat label={t('home.statCleared')} value={n(stats.cleared)} />
                    <Stat
                        label={t('stat.users')}
                        value={n(stats.users)}
                        note={stats.usersWeek > 0 ? t('stat.usersWeek', { n: n(stats.usersWeek) }) : undefined}
                        className="max-lg:col-span-2"
                    />
                </dl>

                {/* Swipe through people who need help, right here */}
                {deck.length > 0 && (
                    <section className="mt-20 grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-16">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('home.swipeT')}</h2>
                            <p className="text-mute mt-3 max-w-md leading-relaxed">{t('home.swipeD')}</p>
                            <ul className="mt-6 space-y-3 text-sm">
                                <li className="flex items-center gap-3">
                                    <span className="bg-panel-2 text-ink grid size-8 shrink-0 place-items-center rounded-full">
                                        <ArrowLeft className="size-4" aria-hidden />
                                    </span>
                                    {t('home.swipeLeft')}
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="bg-brand grid size-8 shrink-0 place-items-center rounded-full text-white">
                                        <Heart className="size-4" aria-hidden />
                                    </span>
                                    {t('home.swipeRight')}
                                </li>
                            </ul>
                            <Link href={route('discover')} className="text-brand mt-6 hidden items-center gap-1.5 text-sm font-medium hover:underline md:inline-flex">
                                {t('home.swipeMore')} <ArrowRight className="size-4" aria-hidden />
                            </Link>
                        </div>
                        <div className="mx-auto w-full max-w-sm">
                            <MiniDeck debts={deck} />
                        </div>
                    </section>
                )}

                {/* Who it's for */}
                <section className="mt-20">
                    <SectionHead title={t('home.forTitle')} />
                    <div className="grid gap-4 md:grid-cols-2">
                        <Audience icon={HandHeart} title={t('home.needT')} body={t('home.needD')} cta={t('home.ctaStart')} href={route('debts.create')} primary />
                        <Audience
                            icon={BadgeCheck}
                            title={t('home.giveT')}
                            body={t('home.giveD')}
                            cta={t('home.ctaPay').replace(/\s*→$/, '')}
                            href={route('discover')}
                        />
                    </div>
                </section>

                {/* How it works */}
                <section className="mt-20">
                    <SectionHead title={t('home.howTitle')} />
                    <ol className="border-line divide-line grid divide-y rounded-xl border bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
                        {(
                            [
                                ['home.s1t', 'home.s1d'],
                                ['home.s2t', 'home.s2d'],
                                ['home.s3t', 'home.s3d'],
                            ] as const
                        ).map(([title, desc], i) => (
                            <li key={title} className="p-6">
                                <span className="bg-brand-soft text-brand grid size-8 place-items-center rounded-full text-sm font-semibold">{i + 1}</span>
                                <h3 className="mt-4 font-semibold">{t(title)}</h3>
                                <p className="text-mute mt-1.5 text-sm leading-relaxed">{t(desc)}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* Small everyday bills */}
                {small.length > 0 && (
                    <section className="mt-20">
                        <SectionHead
                            title={t('small.title')}
                            sub={t('small.sub')}
                            link={{ href: route('debts.index', { small: 1, sort: 'small' }), label: t('small.seeAll') }}
                        />
                        {/* Two columns on desktop; -mb-px hides the last row's bottom border inside the frame. */}
                        <ul className="border-line grid overflow-hidden rounded-xl border bg-white md:grid-cols-2 [&>li]:-mb-px [&>li]:border-b [&>li]:border-line md:[&>li:nth-child(odd)]:border-r">
                            {small.slice(0, 6).map((d) => (
                                <SmallRow key={d.id} debt={d} />
                            ))}
                        </ul>
                    </section>
                )}

                {/* Larger requests */}
                {featured.length > 0 && (
                    <section className="mt-20">
                        <SectionHead title={t('home.waiting')} link={{ href: route('debts.index'), label: t('home.seeAll') }} />
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Skip the hero's spotlight request when there are enough others to fill the row. */}
                            {(featured.length > 3 ? featured.slice(1, 4) : featured.slice(0, 3)).map((d) => (
                                <DebtCard key={d.id} debt={d} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Community */}
                {(topDonors.length > 0 || topCompanies.length > 0) && (
                    <section className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-2">
                        {topDonors.length > 0 && (
                            <div>
                                <SectionHead title={t('lb.title')} link={{ href: route('donors'), label: t('lb.seeAll') }} />
                                <BoardList rows={topDonors.slice(0, 5)} />
                            </div>
                        )}
                        {topCompanies.length > 0 && (
                            <div>
                                <SectionHead title={t('co.title')} link={{ href: route('companies'), label: t('co.seeAll') }} />
                                <BoardList rows={topCompanies.slice(0, 5)} />
                            </div>
                        )}
                    </section>
                )}

                {/* Categories */}
                <section className="mt-20">
                    <SectionHead title={t('home.catTitle')} />
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.filter((c) => categories[c.value]).map((c) => (
                            <Link
                                key={c.value}
                                href={route('debts.index', { cat: c.value })}
                                className="border-line hover:border-ink/30 inline-flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-medium transition"
                            >
                                {t(`cat.${c.value}`)}
                                <span className="text-mute text-xs tabular-nums">{categories[c.value]}</span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Closing call to action */}
                <section className="bg-panel-2 my-20 flex flex-col items-start justify-between gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:p-10">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t('home.endT')}</h2>
                        <p className="text-mute mt-1.5">{t('home.endD')}</p>
                    </div>
                    <Link href={route('debts.create')} className="btn-brand shrink-0 !rounded-xl !px-6 !py-3">
                        {t('home.ctaStart')}
                    </Link>
                </section>
            </div>
        </PublicLayout>
    );
}

function Point({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
    return (
        <li className="text-mute flex items-start gap-2.5 leading-snug">
            <Icon className="text-brand mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{children}</span>
        </li>
    );
}

/** One real open request, so first-time visitors see what a request looks like. */
function Spotlight({ debt }: { debt: Debt }) {
    const { t } = useT();
    return (
        <Link
            href={route('debts.show', debt.id)}
            className="group border-line hidden overflow-hidden rounded-2xl border bg-white shadow-xl shadow-slate-900/5 transition hover:-translate-y-0.5 md:block"
        >
            <div className="relative">
                <Cover debt={debt} className="aspect-[16/10]" />
                <span className="text-ink absolute top-3 left-3 rounded-md bg-white/95 px-2 py-1 text-xs font-medium shadow-sm">{t('home.example')}</span>
            </div>
            <div className="p-5">
                <div className="text-mute flex items-center gap-1 text-xs">
                    {debt.name}
                    {debt.age ? `, ${debt.age}` : ''} · <MapPin className="size-3" aria-hidden /> {debt.city}
                </div>
                <h3 className="group-hover:text-brand mt-1.5 line-clamp-2 font-semibold">{debt.title}</h3>
                <Bar value={debt.paid} max={debt.amount} className="mt-4 h-1.5" />
                <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{t('card.raised', { amount: mnt(debt.paid) })}</span>
                    <span className="text-mute text-xs">{t('card.goal', { amount: mnt(debt.amount) })}</span>
                </div>
            </div>
        </Link>
    );
}

function Stat({ label, value, note, className = '' }: { label: string; value: string; note?: string; className?: string }) {
    return (
        <div className={`border-line min-w-0 rounded-xl border bg-white px-4 py-4 sm:px-5 ${className}`}>
            <dt className="text-mute text-sm first-letter:uppercase">{label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</span>
                {note && <span className="text-xs font-medium text-emerald-700">{note}</span>}
            </dd>
        </div>
    );
}

function SectionHead({ title, sub, link }: { title: string; sub?: string; link?: { href: string; label: string } }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
                {sub && <p className="text-mute mt-1 text-sm">{sub}</p>}
            </div>
            {link && (
                <Link href={link.href} className="text-brand shrink-0 text-sm font-medium hover:underline">
                    {link.label.replace(/\s*→$/, '')} →
                </Link>
            )}
        </div>
    );
}

function Audience({
    icon: Icon,
    title,
    body,
    cta,
    href,
    primary = false,
}: {
    icon: LucideIcon;
    title: string;
    body: string;
    cta: string;
    href: string;
    primary?: boolean;
}) {
    return (
        <div className="border-line flex flex-col rounded-xl border bg-white p-6">
            <span className={`grid size-10 place-items-center rounded-lg ${primary ? 'bg-brand text-white' : 'bg-brand-soft text-brand'}`}>
                <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="text-mute mt-2 flex-1 text-sm leading-relaxed">{body}</p>
            <Link href={href} className="text-brand mt-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
                {cta} <ArrowRight className="size-4" aria-hidden />
            </Link>
        </div>
    );
}

/** Compact everyday bill: what it is, who, how much is left, one tap to pay. */
function SmallRow({ debt }: { debt: Debt }) {
    const { t } = useT();
    return (
        <li className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
                <Link href={route('debts.show', debt.id)} className="hover:text-brand line-clamp-1 font-medium">
                    {debt.title}
                </Link>
                <div className="text-mute mt-0.5 truncate text-[13px]">
                    {t(`cat.${catOf(debt.category).value}`)} · {debt.name}, {debt.city}
                </div>
            </div>
            <Link href={route('debts.show', debt.id) + '#pay'} className="btn-ghost !text-brand hover:!border-brand/40 shrink-0 !rounded-lg !px-3.5 !py-1.5 text-sm">
                {t('small.pay', { amount: mnt(debt.remaining) })}
            </Link>
        </li>
    );
}

function BoardList({ rows }: { rows: BoardRow[] }) {
    const tint = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-800'];
    return (
        <ol className="border-line divide-line divide-y rounded-xl border bg-white">
            {rows.map((row) => (
                <li key={row.user.id}>
                    <Link href={route('users.show', row.user.id)} className="hover:bg-panel-2/50 flex items-center gap-3 px-5 py-3 transition">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${tint[row.rank - 1] ?? 'text-mute'}`}>
                            {row.rank}
                        </span>
                        <UserAvatar user={row.user} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            <NameWithBadge user={row.user} />
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{mnt(row.total)}</span>
                    </Link>
                </li>
            ))}
        </ol>
    );
}
