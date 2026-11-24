import { FollowButton, joinedLabel, PersonRow, UserAvatar, type PublicUser } from '@/components/zeel/people';
import { Cover, DebtCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { mnt, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

type Donation = {
    id: number;
    amount: number;
    message: string | null;
    created_at: string;
    debt: (Pick<Debt, 'id' | 'name' | 'title' | 'category' | 'photo_url' | 'color'>) | null;
};

type Props = {
    profile: PublicUser;
    stats: { given: number; helped: number; requests: number; followers: number; following: number };
    isMe: boolean;
    isFollowing: boolean;
    donations: Donation[];
    requests: Debt[];
    followers: PublicUser[];
    followingList: PublicUser[];
};

type Tab = 'donations' | 'requests' | 'followers' | 'following';

export default function Profile({ profile, stats, isMe, isFollowing, donations, requests, followers, followingList }: Props) {
    const { t } = useT();
    const [tab, setTab] = useState<Tab>(donations.length || !requests.length ? 'donations' : 'requests');

    const tabs: [Tab, string, number][] = [
        ['donations', t('pf.tabDonations'), donations.length],
        ['requests', t('pf.tabRequests'), stats.requests],
        ['followers', t('pf.followers'), stats.followers],
        ['following', t('pf.followingCount'), stats.following],
    ];

    return (
        <PublicLayout title={profile.name}>
            <div className="mx-auto max-w-3xl py-10">
                {/* Header */}
                <section className="z-card overflow-hidden">
                    <div className="from-brand-soft h-24 bg-gradient-to-r to-sky-100" />
                    <div className="px-6 pb-6">
                        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
                            <UserAvatar user={profile} size={96} ring />
                            {isMe ? (
                                <Link href={route('profile.edit')} className="btn-ghost !px-5 !py-2 text-sm">
                                    ✏️ {t('pf.edit')}
                                </Link>
                            ) : (
                                <FollowButton userId={profile.id} initial={isFollowing} />
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold">{profile.name}</h1>
                            {profile.is_company && (
                                <span className="bg-brand-soft text-brand inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                                    {profile.company_verified && <span className="text-sky-500">✓</span>}
                                    🏢 {profile.company_verified ? t('co.verified') : t('co.badge')}
                                </span>
                            )}
                        </div>
                        <div className="text-mute mt-1 flex flex-wrap gap-x-3 text-sm">
                            {profile.city && <span>📍 {profile.city}</span>}
                            {profile.website && (
                                <a
                                    href={`https://${profile.website.replace(/^https?:\/\//, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-brand"
                                >
                                    🔗 {profile.website}
                                </a>
                            )}
                            {profile.joined && <span>🗓️ {joinedLabel(profile.joined, t)}</span>}
                        </div>
                        {profile.bio && <p className="mt-3 max-w-xl">{profile.bio}</p>}

                        <dl className="border-line mt-5 grid grid-cols-2 gap-3 border-t pt-5 text-center sm:grid-cols-4">
                            <Stat label={t('pf.given')} value={mnt(stats.given)} strong />
                            <Stat label={t('pf.helped')} value={stats.helped} />
                            <button type="button" onClick={() => setTab('followers')} className="hover:bg-panel-2 rounded-xl transition">
                                <Stat label={t('pf.followers')} value={stats.followers} />
                            </button>
                            <button type="button" onClick={() => setTab('following')} className="hover:bg-panel-2 rounded-xl transition">
                                <Stat label={t('pf.followingCount')} value={stats.following} />
                            </button>
                        </dl>
                    </div>
                </section>

                {/* Tabs */}
                <nav className="border-line mt-8 flex gap-1 overflow-x-auto border-b">
                    {tabs.map(([key, label, n]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${tab === key ? 'border-brand text-brand' : 'text-mute hover:text-ink border-transparent'}`}
                        >
                            {label} <span className="text-mute font-normal">{n}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-6">
                    {tab === 'donations' && (
                        <>
                            {donations.length === 0 ? (
                                <Empty text={t('pf.noDonations')} />
                            ) : (
                                <ul className="space-y-3">
                                    {donations.map((d) => (
                                        <li key={d.id} className="z-card flex items-center gap-4 p-3">
                                            {d.debt && (
                                                <Link href={route('debts.show', d.debt.id)} className="w-24 shrink-0 overflow-hidden rounded-xl">
                                                    <Cover debt={d.debt as Debt} className="aspect-[4/3]" />
                                                </Link>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                {d.debt && (
                                                    <Link href={route('debts.show', d.debt.id)} className="hover:text-brand line-clamp-1 font-semibold">
                                                        {d.debt.title}
                                                    </Link>
                                                )}
                                                <div className="text-mute text-xs">
                                                    {d.debt?.name} · {fmtDate(d.created_at)}
                                                </div>
                                                {d.message && <p className="mt-1 line-clamp-2 text-sm">“{d.message}”</p>}
                                            </div>
                                            <div className="text-brand shrink-0 font-extrabold">{mnt(d.amount)}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <p className="text-mute mt-4 text-center text-xs">🔒 {t('pf.anonNote')}</p>
                        </>
                    )}

                    {tab === 'requests' &&
                        (requests.length === 0 ? (
                            <Empty text={t('pf.noRequests')} />
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2">
                                {requests.map((d) => (
                                    <DebtCard key={d.id} debt={d} />
                                ))}
                            </div>
                        ))}

                    {(tab === 'followers' || tab === 'following') && <PeopleList people={tab === 'followers' ? followers : followingList} />}
                </div>
            </div>
        </PublicLayout>
    );
}

function Stat({ label, value, strong = false }: { label: string; value: string | number; strong?: boolean }) {
    return (
        <div className="px-2 py-1">
            <dd className={`text-xl font-extrabold tabular-nums ${strong ? 'text-brand' : ''}`}>{value}</dd>
            <dt className="text-mute text-xs">{label}</dt>
        </div>
    );
}

function PeopleList({ people }: { people: PublicUser[] }) {
    const { t } = useT();
    if (people.length === 0) return <Empty text={t('pf.noPeople')} />;
    return (
        <ul className="z-card divide-line divide-y px-4">
            {people.map((p) => (
                <PersonRow key={p.id} person={p} showFollow={false} />
            ))}
        </ul>
    );
}

function Empty({ text }: { text: string }) {
    return <p className="text-mute bg-panel-2 rounded-2xl p-8 text-center text-sm">{text}</p>;
}
