import { useT } from '@/lib/i18n';
import { catOf, mnt, type Debt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Cover, NameLine } from './ui';

const THRESHOLD = 110;

export default function SwipeDeck({ debts }: { debts: Debt[] }) {
    const { t } = useT();
    const [index, setIndex] = useState(0);
    const [dx, setDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
    const start = useRef<number | null>(null);

    const current = debts[index];

    // Right / ♥ → open the request to donate there. Left / ✕ → next card.
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
            <div className="border-line bg-panel mx-auto mt-10 max-w-sm rounded-3xl border p-8 text-center">
                <div className="text-4xl">🌙</div>
                <p className="mt-3 font-semibold">{t('disc.done')}</p>
                <div className="mt-5 flex justify-center gap-2">
                    <button className="btn-ghost" onClick={() => setIndex(0)}>
                        {t('disc.restart')}
                    </button>
                    <Link href={route('debts.index')} className="btn-brand">
                        {t('disc.browse')}
                    </Link>
                </div>
            </div>
        );
    }

    const x = leaving ? leaving * 600 : dx;
    const hint = Math.max(-1, Math.min(1, dx / THRESHOLD));

    return (
        <div className="relative mx-auto mt-6 max-w-sm">
            {/* Deck with depth: two cards peek behind */}
            <div className="relative h-[560px] select-none">
                {[2, 1].map((offset) => {
                    const d = debts[index + offset];
                    if (!d) return null;
                    return (
                        <div
                            key={d.id}
                            className="border-line bg-panel absolute inset-x-0 top-0 h-full rounded-3xl border shadow-sm"
                            style={{ transform: `scale(${1 - offset * 0.04}) translateY(${offset * 14}px)`, opacity: offset === 2 ? 0.5 : 0.8, zIndex: 1 }}
                        />
                    );
                })}
                <Card
                    key={current.id}
                    debt={current}
                    className="z-10 cursor-grab touch-none active:cursor-grabbing"
                    style={{
                        transform: `translateX(${x}px) rotate(${x / 20}deg)`,
                        transition: dragging ? 'none' : 'transform 220ms ease',
                    }}
                    onPointerDown={(e) => {
                        if ((e.target as HTMLElement).closest('button,a')) return; // let the Full-story link work
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
                                <Stamp opacity={hint} className="left-5 -rotate-12 border-emerald-500 text-emerald-600">
                                    {t('disc.help')}
                                </Stamp>
                            )}
                            {hint < -0.3 && (
                                <Stamp opacity={-hint} className="right-5 rotate-12 border-rose-500 text-rose-600">
                                    {t('disc.skip')}
                                </Stamp>
                            )}
                        </>
                    }
                />
            </div>

            {/* Skip / full story / help */}
            <div className="mt-6 flex items-center justify-center gap-6">
                <button
                    aria-label={t('disc.skip')}
                    onClick={skip}
                    className="border-line grid size-16 place-items-center rounded-full border bg-white text-2xl text-rose-500 shadow-md transition hover:scale-105 hover:border-rose-300"
                >
                    ✕
                </button>
                <div className="text-center">
                    <Link href={route('debts.show', current.id)} className="text-mute hover:text-ink block text-sm font-medium">
                        {t('disc.full')}
                    </Link>
                    <div className="text-mute mt-0.5 text-xs">{t('disc.counter', { i: index + 1, n: debts.length })}</div>
                </div>
                <button
                    aria-label={t('disc.help')}
                    onClick={help}
                    className="bg-brand hover:bg-brand-2 grid size-16 place-items-center rounded-full text-2xl text-white shadow-md transition hover:scale-105"
                >
                    ♥
                </button>
            </div>

            {index > 0 && (
                <div className="mt-4 text-center">
                    <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="text-mute hover:text-ink text-xs">
                        ↩ {t('disc.undo')}
                    </button>
                </div>
            )}
        </div>
    );
}

function Stamp({ opacity, className, children }: { opacity: number; className: string; children: ReactNode }) {
    return (
        <div className={`absolute top-6 z-20 rounded-lg border-4 px-3 py-1 text-2xl font-black tracking-widest ${className}`} style={{ opacity }}>
            {children}
        </div>
    );
}

function Card({
    debt,
    className = '',
    overlay,
    ...rest
}: { debt: Debt; className?: string; overlay?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
    const { t } = useT();
    const c = catOf(debt.category);
    const pct = Math.min(100, Math.round((debt.paid / debt.amount) * 100));

    return (
        <div
            {...rest}
            className={`border-line bg-panel absolute inset-0 flex flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-slate-900/15 ${className}`}
        >
            <div className="relative shrink-0">
                <Cover debt={debt} className="h-52" />
                <div className="absolute top-3 right-3">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                        {c.emoji} {t(`cat.${c.value}`)}
                    </span>
                </div>
                {debt.verified && (
                    <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur">
                        {t('card.verified')}
                    </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white [&_*]:!text-white">
                    <NameLine debt={debt} big />
                </div>
                {overlay}
            </div>

            <div className="flex flex-1 flex-col gap-2.5 p-5">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="brand-text text-2xl font-extrabold">{mnt(debt.amount)}</span>
                    <span className="text-mute text-xs">{t('card.donations', { n: debt.payments_count ?? 0 })}</span>
                </div>
                <div className="text-mute -mt-1.5 truncate text-xs">{t('card.owedTo', { name: debt.creditor })}</div>
                <h3 className="leading-snug font-bold">{debt.title}</h3>
                <p className="text-mute line-clamp-3 text-sm">{debt.story}</p>

                <div className="mt-auto pt-1">
                    <div className="bg-brand-soft h-2 overflow-hidden rounded-full ring-1 ring-black/5">
                        <div className="bg-brand h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-mute mt-1.5 flex justify-between text-xs">
                        <span>
                            <b className="text-ink">{mnt(debt.paid)}</b> · {pct}%
                        </span>
                        <span>{t('disc.remaining', { amount: mnt(debt.remaining) })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
