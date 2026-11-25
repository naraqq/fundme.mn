import Comments, { type CommentItem } from '@/components/zeel/comments';
import PayForm from '@/components/zeel/pay-form';
import ReportRequest from '@/components/zeel/report-request';
import ShareBar from '@/components/zeel/share-bar';
import { RequestProgress } from '@/components/zeel/status';
import { MoneyTrail, Receipts, Timeline, VerificationPanel } from '@/components/zeel/transparency-panels';
import { Avatar, Badges, Bar, Cover } from '@/components/zeel/ui';
import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { mnt, type Debt, type Payment } from '@/lib/zeel';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = { debt: Debt; isOwner: boolean; shareUrl: string };

export default function ShowDebt({
    debt,
    isOwner,
    shareUrl,
    reportReasons,
    reported,
    comments,
}: Props & { reportReasons: string[]; reported: boolean; comments: CommentItem[] }) {
    const { t } = useT();
    // Paused (reported) requests take no money; only the owner and admins can even see them.
    const live = debt.status === 'verified' && !debt.paused;

    return (
        <PublicLayout title={`${debt.name} — ${debt.title}`}>
            <div className="pt-8 pb-24 lg:pb-8">
                {debt.paused && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <b className="font-semibold">{t('rep.pausedTitle')}</b> {t('rep.pausedD')}
                    </div>
                )}
                <h1 className="max-w-4xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{debt.title}</h1>

                <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                    {/* ── Main column ── */}
                    <div className="min-w-0">
                        <Cover debt={debt} className="aspect-[16/9] rounded-2xl" credit />

                        <div className="border-line mt-6 flex flex-wrap items-center gap-x-3 gap-y-3 border-b pb-6">
                            <Avatar debt={debt} size={44} />
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold">{t('show.organizer', { name: debt.name })}</div>
                                <div className="text-mute flex items-center gap-1 text-sm">
                                    <MapPin className="size-3.5" aria-hidden /> {debt.city}
                                </div>
                            </div>
                            {/* On phones the badges get their own line so the name isn't squeezed. */}
                            <div className="max-sm:basis-full max-sm:pl-14">
                                <Badges debt={debt} />
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            <RequestProgress debt={debt} />
                            <VerificationPanel debt={debt} />
                        </div>

                        <section className="mt-8">
                            <h2 className="mb-3 text-xl font-bold">{t('show.story')}</h2>
                            <p className="text-ink/90 text-[17px] leading-relaxed whitespace-pre-line">{debt.story}</p>
                        </section>

                        {live && (
                            <>
                                <section className="mt-10 grid gap-6 md:grid-cols-2">
                                    <MoneyTrail debt={debt} />
                                    <Receipts debt={debt} />
                                </section>

                                <section className="mt-10">
                                    <Timeline debt={debt} />
                                </section>

                                <section className="mt-10">
                                    <ShareBar url={shareUrl} title={debt.title} />
                                </section>

                                <div className="mt-12">
                                    <Comments debtId={debt.id} comments={comments} payments={debt.payments ?? []} open={live} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Sticky donate card ── */}
                    <aside className="lg:sticky lg:top-24 lg:h-fit">
                        <DonateCard debt={debt} isOwner={isOwner} shareUrl={shareUrl} />
                        {live && !isOwner && <ReportRequest debtId={debt.id} reasons={reportReasons} reported={reported} />}
                    </aside>
                </div>
            </div>

            {/* Mobile: always-visible donate bar */}
            {live && debt.remaining > 0 && !isOwner && (
                <div className="border-line fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-white/95 p-3 backdrop-blur lg:hidden">
                    <div className="min-w-0 flex-1 text-sm">
                        <b>{mnt(debt.paid)}</b> <span className="text-mute">{t('show.raisedOf', { goal: mnt(debt.amount) })}</span>
                    </div>
                    <a href="#pay" className="btn-brand">
                        {t('show.donateNow')}
                    </a>
                </div>
            )}
        </PublicLayout>
    );
}

function DonorDot() {
    return <div className="bg-brand-soft text-brand grid size-9 shrink-0 place-items-center rounded-full text-sm">💙</div>;
}

/** Named donors link to their profile; anonymous ones render as plain text. */
function DonorName({ payment }: { payment: Payment }) {
    const { t } = useT();
    if (payment.anonymous || !payment.donor_id) return <b>{t('anonymous')}</b>;
    return (
        <Link href={route('users.show', payment.donor_id)} className="hover:text-brand font-bold">
            {payment.payer_name}
        </Link>
    );
}

function DonateCard({ debt, isOwner, shareUrl }: Props) {
    const { t } = useT();
    const { auth } = usePage<SharedData>().props;
    const payments = debt.payments ?? [];
    const live = debt.status === 'verified' && !debt.paused;
    const [paying, setPaying] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [copied, setCopied] = useState(false);

    // Arriving from a "help" swipe (…#pay) opens the form straight away.
    useEffect(() => {
        if (window.location.hash === '#pay') setPaying(true);
    }, []);

    const highlights: [string, Payment | undefined][] = payments.length
        ? [
              [t('show.recent'), payments[0]],
              [t('show.top'), [...payments].sort((a, b) => b.amount - a.amount)[0]],
              [t('show.first'), payments[payments.length - 1]],
          ]
        : [];

    async function share() {
        try {
            if (typeof navigator.share === 'function') await navigator.share({ title: debt.title, url: shareUrl });
            else {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch {
            /* user cancelled */
        }
    }

    return (
        <div id="pay" className="z-card scroll-mt-24 p-6">
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{mnt(debt.paid)}</span>
                <span className="text-mute text-sm">{t('show.raisedOf', { goal: mnt(debt.amount) })}</span>
            </div>
            <Bar value={debt.paid} max={debt.amount} className="mt-3 h-2" />
            <div className="text-mute mt-2 text-sm">{t('card.donations', { n: payments.length })}</div>

            {!live ? null : debt.remaining === 0 ? (
                <div className="bg-brand-soft mt-5 rounded-xl p-4 text-center">
                    <div className="text-3xl">🎉</div>
                    <p className="mt-1 font-semibold">{t('show.isFree', { name: debt.name })}</p>
                    <Link href={route('discover')} className="btn-brand mt-3 w-full">
                        {t('show.helpOther')}
                    </Link>
                </div>
            ) : isOwner ? (
                <p className="text-mute bg-panel-2 mt-5 rounded-xl p-3 text-sm">{t('show.owner')}</p>
            ) : !auth.user ? (
                <div className="mt-5 space-y-2.5">
                    <Link href={route('login')} className="btn-brand w-full py-3 text-base">
                        {t('show.donateNow')}
                    </Link>
                    <p className="text-mute text-center text-xs">
                        {t('show.guest')}{' '}
                        <Link href={route('login')} className="text-brand font-semibold">
                            {t('nav.login')}
                        </Link>
                    </p>
                </div>
            ) : paying ? (
                <PayForm debt={debt} />
            ) : (
                <button type="button" onClick={() => setPaying(true)} className="btn-brand mt-5 w-full py-3 text-base">
                    {t('show.donateNow')}
                </button>
            )}

            {live && (
                <button type="button" onClick={share} className="btn-ghost mt-2.5 w-full py-3 text-base">
                    {copied ? t('share.copied') : t('show.share')}
                </button>
            )}

            {highlights.length > 0 && (
                <div className="border-line mt-6 border-t pt-4">
                    <ul className="space-y-3">
                        {(showAll ? payments.map((p) => ['', p] as [string, Payment]) : highlights).map(([label, p], i) =>
                            p ? (
                                <li key={`${label}-${p.id}-${i}`} className="flex items-center gap-3 text-sm">
                                    <DonorDot />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">
                                            <DonorName payment={p} />
                                        </div>
                                        <div className="text-mute text-xs">
                                            <b className="text-ink">{mnt(p.amount)}</b>
                                            {label && <> · {label}</>}
                                        </div>
                                    </div>
                                </li>
                            ) : null,
                        )}
                    </ul>
                    {payments.length > 1 && (
                        <button type="button" onClick={() => setShowAll(!showAll)} className="text-brand mt-4 text-sm font-semibold">
                            {showAll ? t('show.seeLess') : t('show.seeAll', { n: payments.length })}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
