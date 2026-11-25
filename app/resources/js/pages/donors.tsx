import { LeaderboardPage, type Period } from '@/components/zeel/leaderboard';
import { type BoardRow } from '@/components/zeel/people';
import { useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';

type Props = {
    period: Period;
    board: BoardRow[];
    totals: { donors: number; given: number; users: number; usersWeek: number };
};

export default function Donors({ period, board, totals }: Props) {
    const { t } = useT();
    const n = (v: number) => v.toLocaleString('en-US');

    return (
        <LeaderboardPage
            title={t('lb.title')}
            sub={t('lb.sub')}
            routeName="donors"
            period={period}
            board={board}
            nameColumn={t('lb.col.donor')}
            empty={t('lb.empty')}
            stats={[
                { label: t('lb.given'), value: mnt(totals.given) },
                { label: t('lb.donors'), value: n(totals.donors) },
                { label: t('stat.users'), value: n(totals.users), note: totals.usersWeek > 0 ? t('stat.usersWeek', { n: n(totals.usersWeek) }) : undefined },
            ]}
        />
    );
}
