import { FollowButton, NameWithBadge, UserAvatar, type BoardRow } from '@/components/zeel/people';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';
import { Globe, MapPin } from 'lucide-react';

export type Period = 'all' | 'month';
export type StatTile = { label: string; value: string; note?: string };

// Shared column template so the header lines up with every row.
const COLS = 'sm:grid sm:grid-cols-[3rem_minmax(0,1fr)_6rem_6rem_9rem_7rem] sm:items-center sm:gap-x-4';

// Quiet metal tints for the top three; everyone else gets a plain number.
const RANK_TINT = ['bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-800'];

/** Full ranked-list page used by /donors and /companies. */
export function LeaderboardPage({
    title,
    sub,
    stats,
    routeName,
    period,
    board,
    nameColumn,
    empty,
}: {
    title: string;
    sub: string;
    stats: [StatTile, ...StatTile[]];
    routeName: 'donors' | 'companies';
    period: Period;
    board: BoardRow[];
    nameColumn: string;
    empty: string;
}) {
    const { t } = useT();
    const [first, ...others] = stats;

    return (
        <PublicLayout title={title}>
            <div className="mx-auto max-w-4xl py-10">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <p className="text-mute mt-2 max-w-2xl text-[15px]">{sub}</p>
                </header>

                <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat {...first} className="col-span-2 sm:col-span-1" />
                    {others.map((s) => (
                        <Stat key={s.label} {...s} />
                    ))}
                </dl>

                <div className="mt-10 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">{t('lb.ranking')}</h2>
                    <nav className="bg-panel-2 flex rounded-lg p-1 text-sm font-medium">
                        {(['all', 'month'] as const).map((p) => (
                            <Link
                                key={p}
                                href={route(routeName, p === 'month' ? { period: 'month' } : {})}
                                preserveScroll
                                className={`rounded-md px-3.5 py-1.5 transition ${period === p ? 'text-ink bg-white shadow-sm' : 'text-mute hover:text-ink'}`}
                            >
                                {t(p === 'all' ? 'lb.all' : 'lb.month')}
                            </Link>
                        ))}
                    </nav>
                </div>

                {board.length === 0 ? (
                    <p className="text-mute border-line mt-4 rounded-xl border border-dashed p-12 text-center">{empty}</p>
                ) : (
                    <div className="border-line mt-4 overflow-hidden rounded-xl border bg-white">
                        <div className={`text-mute border-line hidden border-b px-5 py-3 text-xs font-medium ${COLS}`}>
                            <span>#</span>
                            <span>{nameColumn}</span>
                            <span className="text-right">{t('lb.col.helped')}</span>
                            <span className="text-right">{t('lb.col.gifts')}</span>
                            <span className="text-right">{t('lb.col.total')}</span>
                            <span />
                        </div>
                        <ol className="divide-line divide-y">
                            {board.map((row) => (
                                <ListRow key={row.user.id} row={row} />
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}

function Stat({ label, value, note, className = '' }: StatTile & { className?: string }) {
    return (
        <div className={`border-line rounded-xl border bg-white px-5 py-4 ${className}`}>
            {/* Labels are shared inline phrases ("given publicly"), so capitalise them here. */}
            <dt className="text-mute text-sm first-letter:uppercase">{label}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
                {note && <span className="text-xs font-medium text-emerald-700">{note}</span>}
            </dd>
        </div>
    );
}

function ListRow({ row }: { row: BoardRow }) {
    const { t } = useT();
    const href = route('users.show', row.user.id);
    const tint = RANK_TINT[row.rank - 1];
    // Companies show their website under the name; people show their city.
    const site = row.user.is_company && row.user.website ? row.user.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;

    return (
        <li className={`hover:bg-panel-2/50 flex items-center gap-3 px-5 py-3.5 transition ${COLS}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${tint ?? 'text-mute'}`}>
                {row.rank}
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link href={href} className="shrink-0">
                    <UserAvatar user={row.user} size={40} />
                </Link>
                <div className="min-w-0">
                    <Link href={href} className="hover:text-brand block truncate font-medium">
                        <NameWithBadge user={row.user} />
                    </Link>
                    <div className="text-mute mt-0.5 flex items-center gap-1 truncate text-[13px]">
                        {site ? (
                            <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand flex min-w-0 items-center gap-1">
                                <Globe className="size-3.5 shrink-0" aria-hidden />
                                <span className="truncate">{site}</span>
                            </a>
                        ) : (
                            row.user.city && (
                                <>
                                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                                    <span className="truncate">{row.user.city}</span>
                                </>
                            )
                        )}
                        {/* On phones the stat columns collapse into this line. */}
                        <span className="truncate sm:hidden">
                            {(site || row.user.city) && ' · '}
                            {t('lb.helped', { n: row.helped })}
                        </span>
                    </div>
                </div>
            </div>

            <span className="text-mute hidden text-right text-sm tabular-nums sm:block">{row.helped}</span>
            <span className="text-mute hidden text-right text-sm tabular-nums sm:block">{row.gifts}</span>
            <span className="shrink-0 text-right font-semibold tabular-nums">{mnt(row.total)}</span>

            <div className="hidden justify-end sm:flex">
                <FollowButton userId={row.user.id} initial={!!row.isFollowing} size="sm" variant="outline" />
            </div>
        </li>
    );
}
