import { DonorRow, FollowButton, MemberCount, UserAvatar, type BoardRow } from '@/components/zeel/people';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

type Props = {
    period: 'all' | 'month';
    board: BoardRow[];
    totals: { donors: number; given: number; users: number; usersWeek: number };
};

export default function Donors({ period, board, totals }: Props) {
    const { t } = useT();
    const podium = board.slice(0, 3);
    const rest = board.slice(3);
    // Visual order on the podium: 2nd, 1st, 3rd.
    const order = [podium[1], podium[0], podium[2]].filter(Boolean) as BoardRow[];

    return (
        <PublicLayout title={t('lb.title')}>
            <div className="mx-auto max-w-3xl py-10">
                <div className="text-center">
                    <div className="text-5xl">🏆</div>
                    <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('lb.title')}</h1>
                    <p className="text-mute mx-auto mt-2 max-w-lg">{t('lb.sub')}</p>
                    <div className="text-mute mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
                        <MemberCount users={totals.users} usersWeek={totals.usersWeek} />
                        <span>
                            <b className="text-ink">{totals.donors}</b> {t('lb.donors')}
                        </span>
                        <span>
                            <b className="text-ink">{mnt(totals.given)}</b> {t('lb.given')}
                        </span>
                    </div>
                </div>

                <div className="bg-panel-2 mx-auto mt-6 flex w-fit rounded-full p-1 text-sm font-semibold">
                    {(['all', 'month'] as const).map((p) => (
                        <Link
                            key={p}
                            href={route('donors', p === 'month' ? { period: 'month' } : {})}
                            preserveScroll
                            className={`rounded-full px-4 py-1.5 transition ${period === p ? 'text-ink bg-white shadow-sm' : 'text-mute hover:text-ink'}`}
                        >
                            {t(p === 'all' ? 'lb.all' : 'lb.month')}
                        </Link>
                    ))}
                </div>

                {board.length === 0 ? (
                    <p className="text-mute bg-panel-2 mt-10 rounded-2xl p-10 text-center">{t('lb.empty')}</p>
                ) : (
                    <>
                        {/* Podium */}
                        <div className="mt-10 grid grid-cols-3 items-end gap-3">
                            {order.map((row) => {
                                const first = row.rank === 1;
                                return (
                                    <div key={row.user.id} className={`z-card flex flex-col items-center p-4 text-center ${first ? 'border-brand/30 pb-8' : ''}`}>
                                        <div className="text-3xl">{['🥇', '🥈', '🥉'][row.rank - 1]}</div>
                                        <Link href={route('users.show', row.user.id)} className="mt-2">
                                            <UserAvatar user={row.user} size={first ? 72 : 56} ring />
                                        </Link>
                                        <Link href={route('users.show', row.user.id)} className="hover:text-brand mt-2 line-clamp-1 text-sm font-bold">
                                            {row.user.name}
                                        </Link>
                                        <div className={`font-extrabold tabular-nums ${first ? 'text-brand text-xl' : ''}`}>{mnt(row.total)}</div>
                                        <div className="text-mute mb-3 text-xs">{t('lb.helped', { n: row.helped })}</div>
                                        <FollowButton userId={row.user.id} initial={!!row.isFollowing} size="sm" />
                                    </div>
                                );
                            })}
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
