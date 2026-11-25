import { useT } from '@/lib/i18n';
import { type Debt } from '@/lib/zeel';
import { ArrowRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Logo from './logo';
import { MiniDeck } from './swipe-deck';

const SEEN_KEY = 'fundme.welcomeSwipeSeen';
const GOAL = 3;

/**
 * First visit to the home page: meet a few people who need help before exploring the site.
 * After GOAL swipes the "explore" button appears. A quiet close button is always there,
 * since a pop-up nobody can leave frustrates people (and hurts mobile search ranking).
 * Shown once per device.
 */
export default function WelcomeSwipe({ debts }: { debts: Debt[] }) {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const [seen, setSeen] = useState(0);

    useEffect(() => {
        if (debts.length < GOAL) return;
        try {
            if (localStorage.getItem(SEEN_KEY) === '1') return;
            localStorage.setItem(SEEN_KEY, '1');
            setOpen(true);
        } catch {
            /* storage blocked: don't risk showing it on every visit */
        }
    }, [debts.length]);

    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const close = () => setOpen(false);

    if (!open) return null;
    const done = seen >= GOAL;

    return (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-labelledby="welcome-swipe-title">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-6">
                <div className="flex items-center justify-between">
                    <Logo />
                    <button type="button" onClick={close} className="text-mute hover:text-ink hover:bg-panel-2 grid size-9 place-items-center rounded-lg" aria-label={t('ws.close')}>
                        <X className="size-5" />
                    </button>
                </div>

                <div className="mt-5">
                    <h2 id="welcome-swipe-title" className="text-2xl font-bold tracking-tight">
                        {t('ws.title')}
                    </h2>
                    <p className="text-mute mt-1.5 text-sm leading-relaxed">{t('ws.sub')}</p>
                </div>

                {/* Progress toward the 3 people */}
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex flex-1 gap-1.5">
                        {Array.from({ length: GOAL }, (_, i) => (
                            <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i < seen ? 'bg-brand' : 'bg-line'}`} />
                        ))}
                    </div>
                    <span className="text-mute text-xs font-medium tabular-nums">
                        {Math.min(seen, GOAL)}/{GOAL}
                    </span>
                </div>

                <MiniDeck debts={debts} onNext={setSeen} className="mt-5" />

                <div className="mt-5">
                    {done ? (
                        <button type="button" onClick={close} className="btn-ghost w-full !rounded-xl !py-3">
                            {t('ws.explore')} <ArrowRight className="size-4" aria-hidden />
                        </button>
                    ) : (
                        <p className="text-mute text-center text-sm">{t('ws.more', { n: GOAL - seen })}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
