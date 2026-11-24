import { fmtDate, useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export type PublicUser = {
    id: number;
    name: string;
    city: string | null;
    bio: string | null;
    joined: string | null;
    is_company?: boolean;
    company_verified?: boolean;
    website?: string | null;
    logo_url?: string | null;
    followers?: number;
};

export type BoardRow = {
    rank: number;
    user: PublicUser;
    total: number;
    helped: number;
    gifts: number;
    followers: number;
    isFollowing?: boolean;
};

const AVATAR = [
    'from-sky-400 to-blue-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-600',
    'from-violet-400 to-purple-600',
    'from-cyan-400 to-sky-600',
];

type AvatarUser = { id: number; name: string; is_company?: boolean; company_verified?: boolean; logo_url?: string | null };

/** Initial on a gradient from the user id. Companies get a square tile — their uploaded logo if any — + a verified tick. */
export function UserAvatar({ user, size = 40, ring = false }: { user: AvatarUser; size?: number; ring?: boolean }) {
    const company = !!user.is_company;
    const initial = user.name.replace(/^[A-ZА-ЯӨҮЁ]\.\s*/u, '').charAt(0).toUpperCase();
    return (
        <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            {company && user.logo_url ? (
                <img
                    src={user.logo_url}
                    alt={user.name}
                    className={`size-full rounded-xl bg-white object-contain ring-1 ring-black/5 ${ring ? 'ring-4 ring-white' : ''}`}
                />
            ) : (
                <span
                    className={`grid size-full place-items-center bg-gradient-to-br font-bold text-white ${company ? 'from-brand to-brand-2 rounded-xl' : `rounded-full ${AVATAR[user.id % AVATAR.length]}`} ${ring ? 'ring-4 ring-white' : ''}`}
                    style={{ fontSize: size * 0.4 }}
                    aria-hidden
                >
                    {initial}
                </span>
            )}
            {company && user.company_verified && (
                <span
                    className="absolute -right-0.5 -bottom-0.5 grid place-items-center rounded-full bg-sky-500 text-white ring-2 ring-white"
                    style={{ width: size * 0.36, height: size * 0.36, fontSize: size * 0.22 }}
                >
                    ✓
                </span>
            )}
        </span>
    );
}

/** Name with a verified-company tick when applicable. */
export function NameWithBadge({ user, className = '' }: { user: AvatarUser; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            {user.name}
            {user.is_company && user.company_verified && <span className="text-sky-500">✓</span>}
        </span>
    );
}

/** Follow / Following toggle. Optimistic; guests are sent to log in. */
export function FollowButton({ userId, initial, size = 'md' }: { userId: number; initial: boolean; size?: 'sm' | 'md' }) {
    const { t } = useT();
    const { auth } = usePage<SharedData>().props;
    const [following, setFollowing] = useState(initial);
    const [hover, setHover] = useState(false);
    const [busy, setBusy] = useState(false);
    const pad = size === 'sm' ? '!px-3 !py-1 text-xs' : '!px-5 !py-2 text-sm';

    if (!auth.user) {
        return (
            <Link href={route('login')} className={`btn-brand ${pad}`} title={t('pf.loginToFollow')}>
                {t('pf.follow')}
            </Link>
        );
    }
    if (auth.user.id === userId) return null;

    function toggle() {
        const next = !following;
        setFollowing(next);
        setBusy(true);
        const opts = { preserveScroll: true, preserveState: true, onError: () => setFollowing(!next), onFinish: () => setBusy(false) };
        if (next) router.post(route('users.follow', userId), {}, opts);
        else router.delete(route('users.unfollow', userId), opts);
    }

    return (
        <button
            type="button"
            disabled={busy}
            onClick={toggle}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className={following ? `btn-ghost ${pad} ${hover ? '!border-rose-200 !text-rose-600' : ''}` : `btn-brand ${pad}`}
        >
            {following ? (hover ? t('pf.unfollow') : `✓ ${t('pf.following')}`) : `+ ${t('pf.follow')}`}
        </button>
    );
}

/** One person in a list (followers / following). */
export function PersonRow({ person, showFollow = true }: { person: PublicUser & { isFollowing?: boolean }; showFollow?: boolean }) {
    const { t } = useT();
    return (
        <li className="flex items-center gap-3 py-3">
            <Link href={route('users.show', person.id)}>
                <UserAvatar user={person} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
                <Link href={route('users.show', person.id)} className="hover:text-brand block truncate font-semibold">
                    <NameWithBadge user={person} />
                </Link>
                <div className="text-mute truncate text-xs">
                    {person.city && <>📍 {person.city} · </>}
                    {person.followers ?? 0} {t('pf.followers').toLowerCase()}
                </div>
            </div>
            {showFollow && <FollowButton userId={person.id} initial={!!person.isFollowing} size="sm" />}
        </li>
    );
}

/** "12,480 members · +312 this week" — community size as social proof. */
export function MemberCount({ users, usersWeek, className = '' }: { users: number; usersWeek: number; className?: string }) {
    const { t } = useT();
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <b className="tabular-nums">{users.toLocaleString('en-US')}</b> {t('stat.users')}
            {usersWeek > 0 && <span className="font-semibold text-emerald-700">{t('stat.usersWeek', { n: usersWeek.toLocaleString('en-US') })}</span>}
        </span>
    );
}

/** Compact leaderboard row used on home + /donors. */
export function DonorRow({ row, follow = true }: { row: BoardRow; follow?: boolean }) {
    const { t } = useT();
    const medal = ['🥇', '🥈', '🥉'][row.rank - 1];
    return (
        <li className="flex items-center gap-3 py-3">
            <span className="text-mute w-7 shrink-0 text-center font-bold tabular-nums">{medal ?? row.rank}</span>
            <Link href={route('users.show', row.user.id)}>
                <UserAvatar user={row.user} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
                <Link href={route('users.show', row.user.id)} className="hover:text-brand block truncate font-semibold">
                    <NameWithBadge user={row.user} />
                </Link>
                <div className="text-mute truncate text-xs">
                    {row.user.city && <>📍 {row.user.city} · </>}
                    {t('lb.helped', { n: row.helped })} · {row.followers} {t('pf.followers').toLowerCase()}
                </div>
            </div>
            <div className="text-right">
                <div className="font-extrabold tabular-nums">{mnt(row.total)}</div>
                <div className="text-mute text-[11px]">{t('card.donations', { n: row.gifts })}</div>
            </div>
            {follow && (
                <div className="hidden sm:block">
                    <FollowButton userId={row.user.id} initial={!!row.isFollowing} size="sm" />
                </div>
            )}
        </li>
    );
}

export const joinedLabel = (iso: string | null, t: ReturnType<typeof useT>['t']) => (iso ? t('pf.joined', { date: fmtDate(iso) }) : '');
