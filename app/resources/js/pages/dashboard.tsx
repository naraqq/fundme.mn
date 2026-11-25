import { FollowButton, UserAvatar, type BoardRow, type PublicUser } from '@/components/zeel/people';
import { PaymentStageBadge, RequestProgress } from '@/components/zeel/status';
import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { mnt, type Debt, type Payment } from '@/lib/zeel';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

type Me = { id: number; name: string; is_company: boolean; company_verified: boolean; logo_url: string | null; is_admin: boolean };

type FeedItem = {
    type: 'donated' | 'posted';
    id: string;
    at: string;
    who: PublicUser;
    amount: number;
    debt: { id: number; name: string; title: string } | null;
};

type Props = {
    me: Me;
    stats: { given: number; helped: number; requests: number; followers: number; following: number };
    myDebts: Debt[];
    myPayments: Payment[];
    feed: FeedItem[];
    suggest: BoardRow[];
};

export default function Dashboard({ me, stats, myDebts, myPayments, feed, suggest }: Props) {
    const { t } = useT();
    const needsLogo = me.is_company && !me.logo_url;

    return (
        <PublicLayout title={t('dash.title')}>
            <div className="py-8">
                {/* Greeting + actions */}
                <div className="flex flex-wrap items-center gap-4">
                    <UserAvatar user={me} size={56} />
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-2xl font-extrabold tracking-tight">{t('dash.hi', { name: me.name })}</h1>
                        <p className="text-mute text-sm">{t('dash.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('users.show', me.id)} className="btn-ghost !px-4 !py-2 text-sm">
                            {t('dash.seeProfile')}
                        </Link>
                        <Link href={route('profile.edit')} className="btn-ghost !px-4 !py-2 text-sm">
                            ⚙️ {t('dash.settings')}
                        </Link>
                        {me.is_admin && (
                            <Link href={route('admin.index')} className="btn-ghost !px-4 !py-2 text-sm">
                                🛡️ {t('dash.adminPanel')}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Company review / logo nudges */}
                {me.is_company && !me.company_verified && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">⏳ {t('dash.companyPending')}</div>
                )}
                {needsLogo && (
                    <Link href={route('profile.edit')} className="border-brand/30 bg-brand-soft text-brand mt-3 flex items-center gap-2 rounded-2xl border p-4 text-sm font-semibold">
                        🖼️ {t('dash.addLogo')}
                    </Link>
                )}

                {/* Stat tiles */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile to={route('users.show', me.id)} value={mnt(stats.given)} label={t('pf.given')} accent />
                    <StatTile to={route('users.show', me.id)} value={stats.helped} label={t('pf.helped')} />
                    <StatTile to={route('users.show', me.id)} value={stats.requests} label={t('dash.statRequests')} />
                    <StatTile to={route('users.show', me.id)} value={stats.followers} label={t('pf.followers')} />
                </div>

                {/* Primary actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={route('debts.create')} className="btn-brand px-6 py-3 text-base">
                        💙 {t('nav.post')}
                    </Link>
                    <Link href={route('discover')} className="btn-ghost px-6 py-3 text-base">
                        {t('dash.help')}
                    </Link>
                </div>

                {/* Main grid */}
                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* My requests */}
                        <Panel title={t('dash.myDebts')} action={<Link href={route('debts.create')} className="text-brand text-sm font-semibold">{t('dash.postNew')}</Link>}>
                            {myDebts.length === 0 ? (
                                <Empty icon="📝" text={t('dash.noDebts')} cta={{ href: route('debts.create'), label: t('nav.post') }} />
                            ) : (
                                <ul className="space-y-3">
                                    {myDebts.map((d) => (
                                        <li key={d.id}>
                                            <Link href={route('debts.show', d.id)} className="hover:bg-panel-2 -mx-2 block rounded-xl px-2 py-2.5 transition">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <span className="truncate font-semibold">{d.title}</span>
                                                    <span className="text-mute shrink-0 text-xs tabular-nums">
                                                        {mnt(d.paid)} / {mnt(d.amount)}
                                                    </span>
                                                </div>
                                                {d.phase === 'rejected' ? (
                                                    <p className="mt-1 text-xs text-rose-700">{t('phase.rejected')}</p>
                                                ) : (
                                                    <div className="mt-3">
                                                        <RequestProgress debt={d} compact />
                                                    </div>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        {/* My donations */}
                        <Panel title={t('dash.iPaid')} action={<span className="text-mute text-sm">{t('dash.given', { amount: mnt(stats.given) })}</span>}>
                            {myPayments.length === 0 ? (
                                <Empty icon="💙" text={t('dash.nothing')} cta={{ href: route('discover'), label: t('dash.discover') }} />
                            ) : (
                                <ul className="divide-line divide-y">
                                    {myPayments.map((p) => (
                                        <li key={p.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                                            <div className="min-w-0">
                                                {p.debt ? (
                                                    <Link href={route('debts.show', p.debt.id)} className="hover:text-brand block truncate font-medium">
                                                        {p.debt.name} — {p.debt.title}
                                                    </Link>
                                                ) : (
                                                    <span className="text-mute">{t('dash.removed')}</span>
                                                )}
                                                {p.stage && (
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <PaymentStageBadge stage={p.stage} />
                                                        <span className="text-mute text-xs">{t(`ps.${p.stage}D`)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <div className="font-semibold tabular-nums">{mnt(p.amount)}</div>
                                                {p.fee ? <div className="text-mute text-[11px] tabular-nums">{t('dash.fee', { amount: mnt(p.fee) })}</div> : null}
                                                <div className="text-mute text-[11px]">{fmtDate(p.created_at)}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </div>

                    {/* Right rail */}
                    <div className="space-y-6">
                        <Panel title={t('feed.title')}>
                            {feed.length === 0 ? (
                                <p className="text-mute text-sm">{t('feed.empty')}</p>
                            ) : (
                                <ul className="divide-line divide-y">
                                    {feed.map((e) => (
                                        <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                                            <Link href={route('users.show', e.who.id)}>
                                                <UserAvatar user={e.who} size={34} />
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate">
                                                    <Link href={route('users.show', e.who.id)} className="hover:text-brand font-semibold">
                                                        {e.who.name}
                                                    </Link>{' '}
                                                    <span className="text-mute">
                                                        {e.type === 'donated' ? t('feed.donated', { amount: mnt(e.amount) }) : t('feed.posted')}
                                                    </span>
                                                </div>
                                                {e.debt && (
                                                    <Link href={route('debts.show', e.debt.id)} className="text-mute hover:text-brand block truncate text-xs">
                                                        {e.debt.title} · {fmtDate(e.at)}
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>

                        {suggest.length > 0 && (
                            <Panel title={t('feed.suggest')}>
                                <ul className="space-y-3">
                                    {suggest.map((row) => (
                                        <li key={row.user.id} className="flex items-center gap-2">
                                            <Link href={route('users.show', row.user.id)}>
                                                <UserAvatar user={row.user} size={36} />
                                            </Link>
                                            <div className="min-w-0 flex-1">
                                                <Link href={route('users.show', row.user.id)} className="hover:text-brand block truncate text-sm font-semibold">
                                                    {row.user.name}
                                                </Link>
                                                <div className="text-mute truncate text-xs">{mnt(row.total)}</div>
                                            </div>
                                            <FollowButton userId={row.user.id} initial={false} size="sm" />
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

function StatTile({ to, value, label, accent = false }: { to: string; value: string | number; label: string; accent?: boolean }) {
    return (
        <Link href={to} className="z-card hover:border-brand/40 px-4 py-3 transition hover:-translate-y-0.5">
            <div className={`text-xl font-extrabold tabular-nums sm:text-2xl ${accent ? 'text-brand' : ''}`}>{value}</div>
            <div className="text-mute text-xs">{label}</div>
        </Link>
    );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="z-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-bold">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function Empty({ icon, text, cta }: { icon: string; text: string; cta: { href: string; label: string } }) {
    return (
        <div className="bg-panel-2 rounded-xl p-6 text-center">
            <div className="text-3xl">{icon}</div>
            <p className="text-mute mt-2 text-sm">{text}</p>
            <Link href={cta.href} className="btn-brand mt-4 !px-4 !py-2 text-sm">
                {cta.label}
            </Link>
        </div>
    );
}
