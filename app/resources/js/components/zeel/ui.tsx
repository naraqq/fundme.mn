import { useT } from '@/lib/i18n';
import { catOf, mnt, type Debt } from '@/lib/zeel';
import { Link } from '@inertiajs/react';

// Soft, light-theme cover art used when a debt has no photo.
const COVERS: Record<string, { bg: string; dot: string }> = {
    amber: { bg: 'from-amber-100 via-orange-50 to-amber-200', dot: 'from-amber-400 to-orange-500' },
    rose: { bg: 'from-rose-100 via-pink-50 to-rose-200', dot: 'from-rose-400 to-pink-500' },
    sky: { bg: 'from-sky-100 via-blue-50 to-sky-200', dot: 'from-sky-400 to-blue-600' },
    emerald: { bg: 'from-emerald-100 via-teal-50 to-emerald-200', dot: 'from-emerald-400 to-teal-600' },
    violet: { bg: 'from-violet-100 via-purple-50 to-violet-200', dot: 'from-violet-400 to-purple-600' },
    orange: { bg: 'from-orange-100 via-red-50 to-orange-200', dot: 'from-orange-400 to-red-500' },
};
const cover = (d: Debt) => COVERS[d.color] ?? COVERS.amber;

export function Avatar({ debt, size = 48 }: { debt: Debt; size?: number }) {
    return (
        <div
            className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white ${cover(debt).dot}`}
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {debt.name.charAt(0).toUpperCase()}
        </div>
    );
}

/** Photo if uploaded, otherwise generated art: category emoji + initial on a soft gradient. */
export function Cover({ debt, className = '', credit = false }: { debt: Debt; className?: string; credit?: boolean }) {
    if (debt.photo_url) {
        const img = (
            <img
                src={debt.photo_url}
                alt=""
                title={debt.photo_credit ? `📷 ${debt.photo_credit}` : undefined}
                className={`bg-panel-2 w-full object-cover ${className}`}
                loading="lazy"
            />
        );
        if (!credit || !debt.photo_credit) return img;
        // Licensed photos (CC BY / BY-SA) must credit the author.
        return (
            <div className="relative">
                {img}
                <a
                    href={debt.photo_credit_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur hover:bg-black/70"
                >
                    📷 {debt.photo_credit}
                </a>
            </div>
        );
    }
    const c = cover(debt);
    return (
        <div className={`relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br ${c.bg} ${className}`} aria-hidden>
            <span className="absolute -top-6 -right-4 text-[7rem] opacity-15 select-none">{catOf(debt.category).emoji}</span>
            <span className="absolute -bottom-8 -left-6 text-[6rem] opacity-10 select-none">{catOf(debt.category).emoji}</span>
            <div className="flex flex-col items-center gap-2">
                <Avatar debt={debt} size={64} />
                <span className="text-3xl">{catOf(debt.category).emoji}</span>
            </div>
        </div>
    );
}

export function Bar({ value, max, className = 'h-1.5' }: { value: number; max: number; className?: string }) {
    const pct = Math.min(100, (value / Math.max(1, max)) * 100);
    return (
        <div className={`bg-brand-soft overflow-hidden rounded-full ${className}`}>
            <div className="bg-brand h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
    );
}

/** Kept for the swipe cards: bar + "paid · %" / "left". */
export function Progress({ debt, big = false }: { debt: Debt; big?: boolean }) {
    const { t } = useT();
    const pct = Math.min(100, Math.round((debt.paid / debt.amount) * 100));
    return (
        <div>
            <Bar value={debt.paid} max={debt.amount} className={big ? 'h-2.5' : 'h-1.5'} />
            <div className="text-mute mt-1.5 flex justify-between gap-2 text-xs">
                <span>{t('card.paid', { amount: mnt(debt.paid), pct })}</span>
                <span>{debt.remaining === 0 ? t('card.debtFree') : t('card.left', { amount: mnt(debt.remaining) })}</span>
            </div>
        </div>
    );
}

export function Badges({ debt }: { debt: Debt }) {
    const { t } = useT();
    const c = catOf(debt.category);
    return (
        <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="bg-panel-2 text-mute rounded-full px-2.5 py-1">
                {c.emoji} {t(`cat.${c.value}`)}
            </span>
            <PhaseBadge debt={debt} />
        </div>
    );
}

const PHASE_STYLE: Record<Debt['phase'], string> = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    funded: 'bg-sky-50 text-sky-700 ring-sky-200',
    settled: 'bg-brand-soft text-brand ring-brand/20',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function PhaseBadge({ debt }: { debt: Debt }) {
    const { t } = useT();
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${PHASE_STYLE[debt.phase]}`}>{t(`phase.${debt.phase}`)}</span>;
}

export function NameLine({ debt, big = false }: { debt: Debt; big?: boolean }) {
    return (
        <div className="min-w-0">
            <div className={big ? 'text-2xl font-bold' : 'font-semibold'}>
                {debt.name}
                {debt.age ? <span className="text-mute font-normal">, {debt.age}</span> : null}
            </div>
            <div className={`text-mute ${big ? 'text-sm' : 'text-xs'}`}>📍 {debt.city}</div>
        </div>
    );
}

/** Fundraiser card: cover → location → title → thin bar → "₮X raised". */
export function DebtCard({ debt }: { debt: Debt }) {
    const { t } = useT();
    return (
        <Link href={route('debts.show', debt.id)} className="group z-card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative">
                <Cover debt={debt} className="aspect-[16/10] transition duration-500 group-hover:scale-[1.02]" />
                <span className="text-ink absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                    📍 {debt.city}
                </span>
                {debt.phase !== 'open' && (
                    <span className="absolute top-3 left-3">
                        <PhaseBadge debt={debt} />
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <h3 className="group-hover:text-brand line-clamp-2 leading-snug font-bold">{debt.title}</h3>
                <p className="text-mute line-clamp-2 text-sm">{debt.story}</p>
                <div className="mt-auto pt-1">
                    <Bar value={debt.paid} max={debt.amount} />
                    <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-bold">{t('card.raised', { amount: mnt(debt.paid) })}</span>
                        <span className="text-mute text-xs">{t('card.goal', { amount: mnt(debt.amount) })}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

/** Compact card for everyday bills (phone, lunch, bus fare): one tap to pay the rest. */
export function SmallBillCard({ debt }: { debt: Debt }) {
    const { t } = useT();
    const c = catOf(debt.category);
    return (
        <div className="z-card flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start gap-3">
                <div className="bg-brand-soft grid size-11 shrink-0 place-items-center rounded-xl text-2xl">{c.emoji}</div>
                <div className="min-w-0">
                    <Link href={route('debts.show', debt.id)} className="hover:text-brand line-clamp-2 leading-snug font-semibold">
                        {debt.title}
                    </Link>
                    <div className="text-mute mt-0.5 truncate text-xs">
                        {debt.name}
                        {debt.age ? `, ${debt.age}` : ''} · 📍 {debt.city}
                    </div>
                </div>
            </div>
            <div className="mt-auto">
                <Bar value={debt.paid} max={debt.amount} />
                <div className="text-mute mt-1.5 flex justify-between text-xs">
                    <span>{t(`cat.${c.value}`)}</span>
                    <span>{t('small.left', { amount: mnt(debt.remaining) })}</span>
                </div>
            </div>
            <Link href={route('debts.show', debt.id) + '#pay'} className="btn-brand w-full !py-2 text-sm">
                💙 {t('small.pay', { amount: mnt(debt.remaining) })}
            </Link>
        </div>
    );
}
