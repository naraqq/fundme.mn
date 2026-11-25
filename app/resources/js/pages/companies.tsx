import { LeaderboardPage, type Period } from '@/components/zeel/leaderboard';
import { type BoardRow } from '@/components/zeel/people';
import { useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';

type Props = {
    period: Period;
    board: BoardRow[];
    totals: { companies: number; given: number; users: number; usersWeek: number };
};

export default function Companies({ period, board, totals }: Props) {
    const { t } = useT();
    const n = (v: number) => v.toLocaleString('en-US');

    return (
        <LeaderboardPage
            title={t('co.title')}
            sub={t('co.sub')}
            routeName="companies"
            period={period}
            board={board}
            nameColumn={t('co.badge')}
            empty={t('co.empty')}
            stats={[
                { label: t('co.given'), value: mnt(totals.given) },
                { label: t('co.count'), value: n(totals.companies) },
                { label: t('stat.users'), value: n(totals.users), note: totals.usersWeek > 0 ? t('stat.usersWeek', { n: n(totals.usersWeek) }) : undefined },
            ]}
        />
    );
}
