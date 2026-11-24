import { DonorRow, FollowButton, MemberCount, NameWithBadge, UserAvatar, type BoardRow } from '@/components/zeel/people';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type Props = {
    period: 'all' | 'month';
    board: BoardRow[];
    totals: { companies: number; given: number; users: number; usersWeek: number };
};

export default function Companies({ period, board, totals }: Props) {
    const { t } = useT();
    const featured = board.slice(0, 3);
    const rest = board.slice(3);

    return (
        <PublicLayout title={t('co.title')}>
            <div className="mx-auto max-w-3xl py-10">
                <div className="text-center">
                    <div className="text-5xl">🏢</div>
                    <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('co.title')}</h1>
                    <p className="text-mute mx-auto mt-2 max-w-lg">{t('co.sub')}</p>
                    <div className="text-mute mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
                        <MemberCount users={totals.users} usersWeek={totals.usersWeek} />
                        <span>
                            <b className="text-ink">{totals.companies}</b> {t('co.count')}
                        </span>
                        <span>
                            <b className="text-ink">{mnt(totals.given)}</b> {t('co.given')}
                        </span>
                    </div>
                </div>

                <div className="bg-panel-2 mx-auto mt-6 flex w-fit rounded-full p-1 text-sm font-semibold">
                    {(['all', 'month'] as const).map((p) => (
                        <Link
                            key={p}
                            href={route('companies', p === 'month' ? { period: 'month' } : {})}
                            preserveScroll
                            className={`rounded-full px-4 py-1.5 transition ${period === p ? 'text-ink bg-white shadow-sm' : 'text-mute hover:text-ink'}`}
                        >
                            {t(p === 'all' ? 'lb.all' : 'lb.month')}
                        </Link>
                    ))}
                </div>

                {board.length === 0 ? (
                    <p className="text-mute bg-panel-2 mt-10 rounded-2xl p-10 text-center">{t('co.empty')}</p>
                ) : (
                    <>
                        {/* Featured company cards */}
                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            {featured.map((row) => (
                                <div key={row.user.id} className="z-card flex flex-col items-center p-5 text-center">
                                    <Link href={route('users.show', row.user.id)}>
                                        <UserAvatar user={row.user} size={64} ring />
                                    </Link>
                                    <Link href={route('users.show', row.user.id)} className="hover:text-brand mt-3 line-clamp-1 font-bold">
                                        <NameWithBadge user={row.user} />
                                    </Link>
                                    {row.user.website && (
                                        <a
                                            href={`https://${row.user.website.replace(/^https?:\/\//, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-mute hover:text-brand truncate text-xs"
                                        >
                                            🔗 {row.user.website}
                                        </a>
                                    )}
                                    <div className="text-brand mt-2 text-xl font-extrabold tabular-nums">{mnt(row.total)}</div>
                                    <div className="text-mute mb-3 text-xs">{t('lb.helped', { n: row.helped })}</div>
                                    <FollowButton userId={row.user.id} initial={!!row.isFollowing} size="sm" />
                                </div>
                            ))}
                        </div>

                        {rest.length > 0 && (
                            <ul className="z-card divide-line mt-6 divide-y px-4">
                                {rest.map((row) => (
                                    <DonorRow key={row.user.id} row={row} />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </PublicLayout>
    );
}
