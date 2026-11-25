import { useT } from '@/lib/i18n';
import { catOf, mnt, type Debt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BadgeCheck, Heart, MapPin, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Bar, Cover } from './ui';

const THRESHOLD = 110;

export default function SwipeDeck({ debts }: { debts: Debt[] }) {
    const { t } = useT();
    const [index, setIndex] = useState(0);
    const [dx, setDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
    const start = useRef<number | null>(null);

    const current = debts[index];

    // Right / Help → open the request to donate there. Left / Skip → next card.
    function help() {
        if (!current || leaving) return;
        setLeaving(1);
        setTimeout(() => router.visit(route('debts.show', current.id) + '#pay'), 220);
    }

    function skip() {
        if (!current || leaving) return;
        setLeaving(-1);
        setTimeout(() => {
            setIndex((i) => i + 1);
            setLeaving(0);
            setDx(0);
        }, 220);
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') skip();
            else if (e.key === 'ArrowRight') help();
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

    const x = leaving ? leaving * 600 : dx;
    const hint = Math.max(-1, Math.min(1, dx / THRESHOLD));
    const c = catOf(current.category);

    return (
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-12">
            {/* Swipeable photo card, with the next two peeking behind */}
            <div className="relative mx-auto w-full max-w-sm select-none md:mx-0">
                <div className="relative aspect-[4/3] md:aspect-[4/5]">
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
                        className="z-10 cursor-grab touch-none active:cursor-grabbing"
                        style={{
                            transform: `translateX(${x}px) rotate(${x / 22}deg)`,
                            transition: dragging ? 'none' : 'transform 220ms ease',
                        }}
                        onPointerDown={(e) => {
                            if ((e.target as HTMLElement).closest('button,a')) return;
                            start.current = e.clientX;
                            setDragging(true);
                            e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
                        onPointerUp={() => {
                            if (start.current === null) return;
                            start.current = null;
                            setDragging(false);
                            if (dx > THRESHOLD) help();
                            else if (dx < -THRESHOLD) skip();
                            else setDx(0);
                        }}
                        overlay={
                            <>
                                {hint > 0.3 && (
                                    <Stamp opacity={hint} className="left-4 bg-emerald-600">
                                        <Heart className="size-4" aria-hidden /> {t('disc.helpBtn')}
                                    </Stamp>
                                )}
                                {hint < -0.3 && (
                                    <Stamp opacity={-hint} className="right-4 bg-slate-800">
                                        <X className="size-4" aria-hidden /> {t('disc.skipBtn')}
                                    </Stamp>
                                )}
                            </>
                        }
                    />
                </div>

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

                {/* Pinned to the bottom of the screen on phones so Skip/Help are always in reach. */}
                <div className="max-md:bg-panel/90 max-md:border-line mt-5 grid grid-cols-[auto_1fr] gap-3 max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:border-t max-md:px-4 max-md:py-3 max-md:backdrop-blur">

                    <button type="button" onClick={skip} className="btn-ghost !rounded-xl !px-5 !py-3">
                        <X className="size-4" aria-hidden /> {t('disc.skipBtn')}
                    </button>
                    <button type="button" onClick={help} className="btn-brand !rounded-xl !py-3">
                        <Heart className="size-4" aria-hidden /> {t('disc.helpBtn')}
                    </button>
                </div>
            </section>
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

/** Photo-led card: the person, where they are, and what they need. Details live beside it. */
function Card({
    debt,
    className = '',
    overlay,
    ...rest
}: { debt: Debt; className?: string; overlay?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...rest} className={`absolute inset-0 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 shadow-slate-900/10 ring-black/5 ${className}`}>
            <Cover debt={debt} className="pointer-events-none h-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-20 text-white">
                <div className="text-2xl font-semibold">
                    {debt.name}
                    {debt.age ? <span className="font-normal text-white/80">, {debt.age}</span> : null}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/85">
                    <MapPin className="size-3.5" aria-hidden /> {debt.city}
                </div>
            </div>
            {overlay}
        </div>
    );
}
