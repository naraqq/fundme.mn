import { useT } from '@/lib/i18n';
import { catOf, mnt, type Debt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BadgeCheck, Hand, Heart, MapPin, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Bar, Cover } from './ui';

const THRESHOLD = 110;
const HINT_KEY = 'fundme.swipeHintSeen';

/** Open the person's page (story first, donate beside it): what a tap, a right swipe or Help means everywhere. */
const openStory = (debt: Debt) => router.visit(route('debts.show', debt.id));

/**
 * Drag-to-swipe for one card: follow the pointer, tilt, and commit past THRESHOLD.
 * Right → onRight (help), left → onLeft (next person). Buttons call go() for the same animation.
 */
function useSwipe(onLeft: () => void, onRight: () => void, onTap: () => void) {
    const [dx, setDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
    const start = useRef<number | null>(null);
    const travel = useRef(0); // furthest the pointer went, to tell a tap from a drag

    function go(dir: 1 | -1) {
        if (leaving) return;
        setLeaving(dir);
        setTimeout(() => {
            (dir === 1 ? onRight : onLeft)();
            setLeaving(0);
            setDx(0);
        }, 220);
    }

    const bind: HTMLAttributes<HTMLDivElement> = {
        onPointerDown: (e) => {
            if ((e.target as HTMLElement).closest('button,a')) return;
            start.current = e.clientX;
            travel.current = 0;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove: (e) => {
            if (start.current === null) return;
            const d = e.clientX - start.current;
            travel.current = Math.max(travel.current, Math.abs(d));
            setDx(d);
        },
        onPointerUp: () => {
            if (start.current === null) return;
            start.current = null;
            setDragging(false);
            if (travel.current < 8 && !leaving) {
                setDx(0);
                onTap();
            } else if (dx > THRESHOLD) go(1);
            else if (dx < -THRESHOLD) go(-1);
            else setDx(0);
        },
        onPointerCancel: () => {
            start.current = null;
            setDragging(false);
            setDx(0);
        },
    };

    return {
        x: leaving ? leaving * 600 : dx,
        hint: Math.max(-1, Math.min(1, dx / THRESHOLD)),
        dragging,
        moved: dx !== 0 || leaving !== 0,
        go,
        bind,
    };
}

/** Has this visitor already learned to swipe? (Per device; storage may be blocked.) */
function useSwipeHint() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        try {
            setShow(localStorage.getItem(HINT_KEY) !== '1');
        } catch {
            setShow(true);
        }
    }, []);
    function done() {
        setShow(false);
        try {
            localStorage.setItem(HINT_KEY, '1');
        } catch {
            /* private mode */
        }
    }
    return { show, done };
}

/** The swiping card stack: the current card on top, the next two peeking behind. */
function Stack({
    debts,
    index,
    swipe,
    showHint,
    detailed = false,
    className = '',
}: {
    debts: Debt[];
    index: number;
    swipe: ReturnType<typeof useSwipe>;
    showHint: boolean;
    detailed?: boolean;
    className?: string;
}) {
    const { t } = useT();
    const current = debts[index];
    const hinting = showHint && !swipe.moved;

    return (
        <div className={`relative select-none ${className}`}>
            {[2, 1].map((offset) => {
                const d = debts[index + offset];
                if (!d) return null;
                return (
                    <div
                        key={d.id}
                        className="border-line absolute inset-0 rounded-2xl border bg-white"
                        style={{ transform: `scale(${1 - offset * 0.04}) translateY(${offset * 12}px)`, opacity: offset === 2 ? 0.5 : 0.85 }}
                    />
                );
            })}
            <Card
                key={current.id}
                debt={current}
                detailed={detailed}
                className={`z-10 cursor-grab touch-pan-y active:cursor-grabbing ${hinting ? 'animate-swipe-hint' : ''}`}
                style={{
                    transform: hinting ? undefined : `translateX(${swipe.x}px) rotate(${swipe.x / 22}deg)`,
                    transition: swipe.dragging ? 'none' : 'transform 220ms ease',
                }}
                {...swipe.bind}
                overlay={
                    <>
                        {swipe.hint > 0.3 && (
                            <Stamp opacity={swipe.hint} className="left-4 bg-emerald-600">
                                <Heart className="size-4" aria-hidden /> {t('disc.helpBtn')}
                            </Stamp>
                        )}
                        {swipe.hint < -0.3 && (
                            <Stamp opacity={-swipe.hint} className="right-4 bg-slate-800">
                                <ArrowLeft className="size-4" aria-hidden /> {t('disc.skipBtn')}
                            </Stamp>
                        )}
                        {hinting && <SwipeHint />}
                    </>
                }
            />
        </div>
    );
}

/** First-time hint: which way means what, said kindly. */
function SwipeHint() {
    const { t } = useT();
    return (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="inline-flex items-center gap-1">
                <ArrowLeft className="size-3.5" aria-hidden /> {t('disc.skipBtn')}
            </span>
            <Hand className="animate-swipe-hand size-4" aria-hidden />
            <span className="inline-flex items-center gap-1">
                {t('disc.helpBtn')} <ArrowRight className="size-3.5" aria-hidden />
            </span>
        </div>
    );
}

/** Full Discover page: card on the left, story and progress on the right. */
export default function SwipeDeck({ debts }: { debts: Debt[] }) {
    const { t } = useT();
    const [index, setIndex] = useState(0);
    const hintState = useSwipeHint();
    const current = debts[index];
    const swipe = useSwipe(
        () => {
            hintState.done();
            setIndex((i) => i + 1);
        },
        () => {
            hintState.done();
            if (current) openStory(current);
        },
        () => current && openStory(current),
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!current) return;
            if (e.key === 'ArrowLeft') swipe.go(-1);
            else if (e.key === 'ArrowRight') swipe.go(1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!current) {
        return (
            <div className="border-line mx-auto mt-10 max-w-md rounded-2xl border bg-white p-10 text-center">
                <p className="text-lg font-semibold">{t('disc.done')}</p>
                <div className="mt-6 flex justify-center gap-2">
                    <button className="btn-ghost !rounded-lg !px-4 !py-2 text-sm" onClick={() => setIndex(0)}>
                        <RotateCcw className="size-4" aria-hidden /> {t('disc.restart')}
                    </button>
                    <Link href={route('debts.index')} className="btn-brand !rounded-lg !px-4 !py-2 text-sm">
                        {t('disc.browse')}
                    </Link>
                </div>
            </div>
        );
    }

    const c = catOf(current.category);

    return (
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-12">
            <div className="mx-auto w-full max-w-sm md:mx-0">
                <Stack debts={debts} index={index} swipe={swipe} showHint={hintState.show} className="aspect-[4/3] md:aspect-[4/5]" />

                <div className="text-mute mt-5 flex items-center justify-between text-sm">
                    <span className="tabular-nums">{t('disc.counter', { i: index + 1, n: debts.length })}</span>
                    {index > 0 ? (
                        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="hover:text-ink inline-flex items-center gap-1.5">
                            <RotateCcw className="size-3.5" aria-hidden /> {t('disc.undo')}
                        </button>
                    ) : (
                        <span className="hidden items-center gap-1 text-xs md:inline-flex">
                            <Kbd>
                                <ArrowLeft className="size-3" />
                            </Kbd>
                            <Kbd>
                                <ArrowRight className="size-3" />
                            </Kbd>
                            <span className="ml-1">{t('disc.keys')}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Details + actions for the current card */}
            <section key={current.id} className="animate-in fade-in min-w-0 duration-300 md:pt-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span className="bg-panel-2 text-ink rounded-md px-2 py-1">{t(`cat.${c.value}`)}</span>
                    {current.verified && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                            <BadgeCheck className="size-3.5" aria-hidden /> {t('card.verified').replace(/^✓\s*/, '')}
                        </span>
                    )}
                </div>

                <h2 className="mt-4 text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{current.title}</h2>
                <p className="text-mute mt-4 line-clamp-5 text-[15px] leading-relaxed">{current.story}</p>
                <Link href={route('debts.show', current.id)} className="text-brand mt-2 inline-block text-sm font-medium hover:underline">
                    {t('disc.full')} →
                </Link>

                <div className="border-line mt-6 rounded-xl border bg-white p-5">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-2xl font-semibold tracking-tight tabular-nums">{mnt(current.paid)}</span>
                        <span className="text-mute text-sm">{t('card.goal', { amount: mnt(current.amount) })}</span>
                    </div>
                    <Bar value={current.paid} max={current.amount} className="mt-3 h-2" />
                    <div className="text-mute mt-2.5 flex justify-between gap-3 text-sm">
                        <span>{t('card.donations', { n: current.payments_count ?? 0 })}</span>
                        <span className="text-ink font-medium">{t('disc.remaining', { amount: mnt(current.remaining) })}</span>
                    </div>
                </div>

                {/* Pinned to the bottom of the screen on phones so Next/Help are always in reach. */}
                <div className="max-md:bg-panel/90 max-md:border-line mt-5 grid grid-cols-[auto_1fr] gap-3 max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:border-t max-md:px-4 max-md:py-3 max-md:backdrop-blur">
                    <button type="button" onClick={() => swipe.go(-1)} className="btn-ghost !rounded-xl !px-5 !py-3">
                        <ArrowLeft className="size-4" aria-hidden /> {t('disc.skipBtn')}
                    </button>
                    <button type="button" onClick={() => swipe.go(1)} className="btn-brand !rounded-xl !py-3">
                        <Heart className="size-4" aria-hidden /> {t('disc.helpBtn')}
                    </button>
                </div>
            </section>
        </div>
    );
}

/**
 * Compact deck for the home page: swipe through a handful of people right there.
 * Each card carries its own headline and amount left, since there's no side panel.
 */
export function MiniDeck({ debts, onNext, className = '' }: { debts: Debt[]; onNext?: (seen: number) => void; className?: string }) {
    const { t } = useT();
    const [index, setIndex] = useState(0);
    const hintState = useSwipeHint();
    const current = debts[index];
    const swipe = useSwipe(
        () => {
            hintState.done();
            setIndex((i) => i + 1);
            onNext?.(index + 1);
        },
        () => {
            hintState.done();
            if (current) openStory(current);
        },
        () => current && openStory(current),
    );

    if (!current) {
        return (
            <div className="border-line flex aspect-[4/5] max-h-[60svh] w-full flex-col items-center justify-center rounded-2xl border bg-white p-8 text-center">
                <p className="text-lg font-semibold">{t('home.swipeDone', { n: debts.length })}</p>
                <Link href={route('discover')} className="btn-brand mt-5 !rounded-xl !px-5 !py-2.5 text-sm">
                    {t('home.swipeMore')} <ArrowRight className="size-4" aria-hidden />
                </Link>
                <button type="button" onClick={() => setIndex(0)} className="text-mute hover:text-ink mt-3 inline-flex items-center gap-1.5 text-sm">
                    <RotateCcw className="size-3.5" aria-hidden /> {t('disc.restart')}
                </button>
            </div>
        );
    }

    return (
        <div className={`w-full ${className}`}>
            <Stack debts={debts} index={index} swipe={swipe} showHint={hintState.show} detailed className="mx-auto aspect-[4/5] max-h-[60svh]" />
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => swipe.go(-1)} className="btn-ghost !rounded-xl !py-3">
                    <ArrowLeft className="size-4" aria-hidden /> {t('disc.skipBtn')}
                </button>
                <button type="button" onClick={() => swipe.go(1)} className="btn-brand !rounded-xl !py-3">
                    <Heart className="size-4" aria-hidden /> {t('disc.helpBtn')}
                </button>
            </div>
            <p className="text-mute mt-3 text-center text-xs tabular-nums">{t('disc.counter', { i: index + 1, n: debts.length })}</p>
        </div>
    );
}

function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="border-line grid size-5 place-items-center rounded border bg-white">{children}</kbd>;
}

function Stamp({ opacity, className, children }: { opacity: number; className: string; children: ReactNode }) {
    return (
        <div
            className={`absolute top-4 z-20 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-lg ${className}`}
            style={{ opacity }}
        >
            {children}
        </div>
    );
}

/** Photo-led card: the person and where they are; `detailed` adds what it's for and what's left. */
function Card({
    debt,
    detailed = false,
    className = '',
    overlay,
    ...rest
}: { debt: Debt; detailed?: boolean; className?: string; overlay?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
    const { t } = useT();
    return (
        <div {...rest} className={`absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 shadow-slate-900/10 ring-black/5 ${className}`}>
            <Cover debt={debt} className="pointer-events-none h-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-24 text-white">
                <div className="text-2xl font-semibold">
                    {debt.name}
                    {debt.age ? <span className="font-normal text-white/80">, {debt.age}</span> : null}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
                    <MapPin className="size-3.5" aria-hidden /> {debt.city}
                </div>
                {detailed && (
                    <>
                        <p className="mt-3 line-clamp-2 leading-snug font-medium">{debt.title}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
                            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (debt.paid / Math.max(1, debt.amount)) * 100)}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-3 text-sm text-white/90">
                            <span>{t('disc.remaining', { amount: mnt(debt.remaining) })}</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-white">
                                {t('disc.readStory')} <ArrowRight className="size-3.5" aria-hidden />
                            </span>
                        </div>
                    </>
                )}
            </div>
            {overlay}
        </div>
    );
}
