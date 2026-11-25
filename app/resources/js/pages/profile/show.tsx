import { useAgo } from '@/components/zeel/comments';
import { FollowButton, joinedLabel, PersonRow, UserAvatar, type PublicUser } from '@/components/zeel/people';
import { Cover, DebtCard } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { mnt, type Debt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { BadgeCheck, CalendarDays, Globe, MapPin, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Donation = {
    id: number;
    amount: number;
    message: string | null;
    created_at: string;
    debt: (Pick<Debt, 'id' | 'name' | 'title' | 'category' | 'photo_url' | 'color'>) | null;
};

type ProfileComment = { id: number; body: string; at: string; debt: { id: number; name: string; title: string } };

type Props = {
    profile: PublicUser;
    stats: { given: number; helped: number; requests: number; followers: number; following: number };
    isMe: boolean;
    isFollowing: boolean;
    donations: Donation[];
    requests: Debt[];
    comments: ProfileComment[];
    followers: PublicUser[];
    followingList: PublicUser[];
};

type Tab = 'donations' | 'requests' | 'comments' | 'followers' | 'following';

export default function Profile({ profile, stats, isMe, isFollowing, donations, requests, comments, followers, followingList }: Props) {
    const { t } = useT();
    const tabs: [Tab, string, number][] = [
        ['donations', t('pf.tabDonations'), donations.length],
        ['requests', t('pf.tabRequests'), stats.requests],
        ['comments', t('cm.title'), comments.length],
        ['followers', t('pf.followers'), stats.followers],
        ['following', t('pf.followingCount'), stats.following],
    ];
    // Open on the first tab that has something in it.
    const [tab, setTab] = useState<Tab>(tabs.find(([, , n]) => n > 0)?.[0] ?? 'donations');
    const site = profile.website?.replace(/^https?:\/\//, '');

    return (
        <PublicLayout title={profile.name}>
            <div className="mx-auto max-w-3xl py-10">
                {/* Header: who they are, in one calm block */}
                <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <UserAvatar user={profile} size={80} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
                                    {profile.name}
                                    {profile.is_company && (
                                        <span className="bg-panel-2 text-mute inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                                            {profile.company_verified && <BadgeCheck className="size-3.5 text-sky-500" aria-hidden />}
                                            {profile.company_verified ? t('co.verified') : t('co.badge')}
                                        </span>
                                    )}
                                </h1>
                                <div className="text-mute mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    {profile.city && (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="size-3.5" aria-hidden /> {profile.city}
                                        </span>
                                    )}
                                    {site && (
                                        <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand inline-flex items-center gap-1">
                                            <Globe className="size-3.5" aria-hidden /> {site}
                                        </a>
                                    )}
                                    {profile.joined && (
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="size-3.5" aria-hidden /> {joinedLabel(profile.joined, t)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isMe ? (
                                <Link href={route('profile.edit')} className="btn-ghost !rounded-lg !px-4 !py-2 text-sm">
                                    <Pencil className="size-4" aria-hidden /> {t('pf.edit')}
                                </Link>
                            ) : (
                                <FollowButton userId={profile.id} initial={isFollowing} />
                            )}
                        </div>

                        {profile.bio && <p className="mt-3 max-w-xl leading-relaxed">{profile.bio}</p>}

                        {/* Stats: one quiet line instead of a wall of zeros */}
                        <div className="text-mute mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                            <span>
                                <b className="text-ink font-semibold tabular-nums">{mnt(stats.given)}</b> <span className="lowercase">{t('pf.given')}</span>
                            </span>
                            <span>
                                <b className="text-ink font-semibold tabular-nums">{stats.helped}</b> <span className="lowercase">{t('pf.helped')}</span>
                            </span>
                            <button type="button" onClick={() => setTab('followers')} className="hover:text-ink">
                                <b className="text-ink font-semibold tabular-nums">{stats.followers}</b> <span className="lowercase">{t('pf.followers')}</span>
                            </button>
                            <button type="button" onClick={() => setTab('following')} className="hover:text-ink">
                                <b className="text-ink font-semibold tabular-nums">{stats.following}</b> <span className="lowercase">{t('pf.followingCount')}</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Tabs (scroll sideways on small phones, without a visible scrollbar) */}
                <nav className="border-line mt-8 flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map(([key, label, n]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition ${tab === key ? 'border-ink text-ink' : 'text-mute hover:text-ink border-transparent'}`}
                        >
                            {label} <span className="text-mute/80 ml-0.5 tabular-nums">{n}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-6">
                    {tab === 'donations' &&
                        (donations.length === 0 ? (
                            <Empty text={t('pf.noDonations')} cta={isMe ? { href: route('discover'), label: t('dash.help') } : undefined} />
                        ) : (
                            <>
                                <ul className="border-line divide-line divide-y rounded-xl border bg-white">
                                    {donations.map((d) => (
                                        <li key={d.id} className="flex items-center gap-4 p-3">
                                            {d.debt && (
                                                <Link href={route('debts.show', d.debt.id)} className="w-16 shrink-0 overflow-hidden rounded-lg">
                                                    <Cover debt={d.debt as Debt} className="aspect-square" />
                                                </Link>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                {d.debt && (
                                                    <Link href={route('debts.show', d.debt.id)} className="hover:text-brand line-clamp-2 font-medium sm:line-clamp-1">
                                                        {d.debt.title}
                                                    </Link>
                                                )}
                                                <div className="text-mute truncate text-xs">
                                                    <b className="text-ink font-semibold sm:hidden">{mnt(d.amount)} · </b>
                                                    {d.debt?.name} · {fmtDate(d.created_at)}
                                                </div>
                                                {d.message && <p className="mt-1 line-clamp-2 text-sm">“{d.message}”</p>}
                                            </div>
                                            <div className="hidden shrink-0 font-semibold tabular-nums sm:block">{mnt(d.amount)}</div>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-mute mt-3 text-xs">{t('pf.anonNote')}</p>
                            </>
                        ))}

                    {tab === 'requests' &&
                        (requests.length === 0 ? (
                            <Empty text={t('pf.noRequests')} cta={isMe ? { href: route('debts.create'), label: t('nav.post') } : undefined} />
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2">
                                {requests.map((d) => (
                                    <DebtCard key={d.id} debt={d} />
                                ))}
                            </div>
                        ))}

                    {tab === 'comments' && <CommentList comments={comments} isMe={isMe} />}

                    {(tab === 'followers' || tab === 'following') && <PeopleList people={tab === 'followers' ? followers : followingList} />}
                </div>
            </div>
        </PublicLayout>
    );
}

function PeopleList({ people }: { people: PublicUser[] }) {
    const { t } = useT();
    if (people.length === 0) return <Empty text={t('pf.noPeople')} />;
    return (
        <ul className="border-line divide-line divide-y rounded-xl border bg-white px-4">
            {people.map((p) => (
                <PersonRow key={p.id} person={p} showFollow={false} />
            ))}
        </ul>
    );
}

function Empty({ text, cta }: { text: string; cta?: { href: string; label: string } }) {
    return (
        <div className="py-10 text-center">
            <p className="text-mute text-sm">{text}</p>
            {cta && (
                <Link href={cta.href} className="text-brand mt-2 inline-block text-sm font-medium hover:underline">
                    {cta.label} →
                </Link>
            )}
        </div>
    );
}

/** Everything this person said on public requests, newest first, each linking back to the request. */
function CommentList({ comments, isMe }: { comments: ProfileComment[]; isMe: boolean }) {
    const { t } = useT();
    const ago = useAgo();
    if (comments.length === 0) return <Empty text={t('pf.noComments')} />;

    return (
        <ul className="border-line divide-line divide-y rounded-xl border bg-white">
            {comments.map((c) => (
                <li key={c.id} className="flex gap-3 p-4">
                    <MessageSquare className="text-mute mt-0.5 size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <Link href={route('debts.show', c.debt.id)} className="hover:text-brand min-w-0 text-sm font-semibold">
                                <span className="line-clamp-2">
                                    {c.debt.name} — {c.debt.title}
                                </span>
                            </Link>
                            <span className="text-mute shrink-0 text-xs">{ago(c.at)}</span>
                        </div>
                        <p className="mt-1 leading-relaxed break-words whitespace-pre-line">{c.body}</p>
                        {isMe && (
                            <button
                                type="button"
                                onClick={() => confirm(t('cm.confirmDelete')) && router.delete(route('comments.destroy', c.id), { preserveScroll: true })}
                                className="text-mute mt-2 inline-flex items-center gap-1 text-xs hover:text-rose-600"
                            >
                                <Trash2 className="size-3.5" aria-hidden /> {t('cm.delete')}
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
