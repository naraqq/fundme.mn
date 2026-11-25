import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Status = 'PENDING' | 'VERIFIED' | 'EXPIRED';

type Verification = {
    phone: string;
    code: string;
    status: Status;
    sms_uri: string;
    display_instruction: string;
    expires_at: string;
    shortcode: string;
};

const POLL_MS = 3000;

export default function PhoneLogin({ verification }: { verification: Verification | null }) {
    const { t } = useT();

    return (
        <PublicLayout title={t('ph.title')}>
            <div className="mx-auto max-w-md py-12 sm:py-16">
                <div className="bg-brand-soft mx-auto mb-5 grid size-14 place-items-center rounded-2xl text-2xl">📱</div>
                <h1 className="text-center text-3xl font-bold tracking-tight">{verification ? t('ph.stepTitle') : t('ph.title')}</h1>
                {!verification && <p className="text-mute mt-2 text-center">{t('ph.sub')}</p>}

                <div className="z-card mt-8 p-6 sm:p-7">{verification ? <SmsStep v={verification} /> : <PhoneStep />}</div>

                <p className="text-mute mt-6 text-center text-xs leading-relaxed">🛡️ {t('ph.why')}</p>
            </div>
        </PublicLayout>
    );
}

function PhoneStep() {
    const { t } = useT();
    const { data, setData, post, processing, errors } = useForm({ phone: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('login.phone.start'));
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label htmlFor="phone" className="z-label">
                    {t('ph.phone')}
                </label>
                <div className="border-line focus-within:border-brand focus-within:ring-brand/15 flex overflow-hidden rounded-xl border bg-white focus-within:ring-4">
                    <span className="bg-panel-2 text-mute border-line grid place-items-center border-r px-3.5 text-sm font-semibold">🇲🇳 +976</span>
                    <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        autoFocus
                        required
                        placeholder="9911 2233"
                        className="w-full px-3.5 py-3 text-lg tracking-wider outline-none"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value.replace(/[^\d\s+]/g, '').slice(0, 16))}
                    />
                </div>
                {errors.phone && <p className="mt-1.5 text-sm text-rose-600">{errors.phone}</p>}
            </div>
            <button disabled={processing || data.phone.replace(/\D/g, '').length < 8} className="btn-brand w-full py-3 text-base">
                {t('ph.continue')}
            </button>
            <div className="text-mute flex items-center gap-3 text-xs">
                <span className="bg-line h-px flex-1" />
                {t('ph.useApp')}
                <span className="bg-line h-px flex-1" />
            </div>
            <Link href={route('login.email')} className="btn-ghost w-full">
                ✉️ {t('ph.email')}
            </Link>
        </form>
    );
}

function SmsStep({ v }: { v: Verification }) {
    const { t } = useT();
    const [status, setStatus] = useState<Status>(v.status);
    const [left, setLeft] = useState(() => secondsLeft(v.expires_at));
    const completing = useRef(false);

    // Countdown to expiresAt.
    useEffect(() => {
        const id = setInterval(() => setLeft(secondsLeft(v.expires_at)), 1000);
        return () => clearInterval(id);
    }, [v.expires_at]);

    // Poll our server (which asks verify.mn) every 3s until VERIFIED / EXPIRED, with a hard stop.
    useEffect(() => {
        if (status !== 'PENDING') return;
        const hardStop = new Date(v.expires_at).getTime() + 15_000;
        let timer: ReturnType<typeof setTimeout>;
        let cancelled = false;

        async function tick() {
            if (cancelled) return;
            if (Date.now() > hardStop) {
                setStatus('EXPIRED');
                return;
            }
            try {
                const res = await fetch(route('login.phone.status'), { headers: { Accept: 'application/json' } });
                if (res.ok) {
                    const next = (await res.json()).status as Status;
                    if (next !== 'PENDING') {
                        setStatus(next);
                        return;
                    }
                }
            } catch {
                /* network blip — keep polling */
            }
            timer = setTimeout(tick, POLL_MS);
        }
        timer = setTimeout(tick, POLL_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [status, v.expires_at]);

    // Verified → finish login (server re-checks with verify.mn before logging in).
    useEffect(() => {
        if (status === 'VERIFIED' && !completing.current) {
            completing.current = true;
            router.post(route('login.phone.complete'));
        }
    }, [status]);

    const newCode = () => router.post(route('login.phone.start'), { phone: v.phone });
    const cancel = () => router.post(route('login.phone.cancel'));

    if (status === 'VERIFIED') {
        return (
            <div className="py-6 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-3xl">✅</div>
                <p className="mt-4 font-semibold text-emerald-700">{t('ph.verified')}</p>
            </div>
        );
    }

    if (status === 'EXPIRED') {
        return (
            <div className="space-y-4 text-center">
                <div className="text-4xl">⌛</div>
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t('ph.expired')}</p>
                <button type="button" onClick={newCode} className="btn-brand w-full py-3">
                    {t('ph.newCode')}
                </button>
                <button type="button" onClick={cancel} className="text-mute hover:text-ink text-sm">
                    {t('ph.change')}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* verify.mn's instruction, verbatim — it names the number the SMS must come from. */}
            <p className="border-brand/20 bg-brand-soft text-ink rounded-xl border p-4 text-[15px] leading-relaxed whitespace-pre-line">{v.display_instruction}</p>

            <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-panel-2 rounded-xl p-3">
                    <div className="text-mute text-xs">{t('ph.code')}</div>
                    <div className="font-mono text-2xl font-bold tracking-[0.2em]">{v.code}</div>
                </div>
                <div className="bg-panel-2 rounded-xl p-3">
                    <div className="text-mute text-xs">{t('ph.to')}</div>
                    <div className="font-mono text-2xl font-bold">{v.shortcode}</div>
                </div>
            </div>

            <a href={v.sms_uri} className="btn-brand w-full py-3.5 text-base">
                💬 {t('ph.send')}
            </a>
            <p className="text-mute hidden text-center text-xs sm:block">{t('ph.desktop')}</p>

            <div className="border-line flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-mute flex items-center gap-2">
                    <span className="border-brand size-3.5 animate-spin rounded-full border-2 border-t-transparent" />
                    {t('ph.waiting')}
                </span>
                <span className="font-mono text-xs tabular-nums">{t('ph.expiresIn', { time: mmss(left) })}</span>
            </div>
            <p className="text-mute text-xs">💸 {t('ph.cost')}</p>
            <button type="button" onClick={cancel} className="text-mute hover:text-ink text-sm">
                ← {t('ph.change')} ({v.phone})
            </button>
        </div>
    );
}

function secondsLeft(iso: string) {
    return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}

function mmss(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
