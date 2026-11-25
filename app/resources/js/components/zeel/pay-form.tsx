import { useT } from '@/lib/i18n';
import { feeFor, mnt, type Debt } from '@/lib/zeel';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function PayForm({ debt }: { debt: Debt }) {
    const { t } = useT();
    const { feePercent } = usePage<SharedData>().props;
    // Three suggestions below what's left (₮5k… for lunch money, ₮1M for big loans), plus "all".
    const presets = [5_000, 10_000, 20_000, 50_000, 200_000, 1_000_000].filter((v) => v < debt.remaining).slice(-3);
    const { data, setData, post, processing, errors } = useForm({
        amount: debt.remaining <= 100_000 ? debt.remaining : (presets[0] ?? debt.remaining),
        anonymous: false as boolean,
        message: '',
    });

    // What actually goes to the request (capped at what's left), and the fee on top.
    const donation = Math.min(data.amount, debt.remaining);
    const fee = feeFor(donation, feePercent);

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('debts.pay', debt.id), { preserveScroll: true, onSuccess: () => setData('message', '') });
    }

    return (
        <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
                <label className="z-label">{t('pay.howMuch')}</label>
                <div className="mb-2 flex flex-wrap gap-2">
                    {[...presets, debt.remaining].map((v) => (
                        <button
                            type="button"
                            key={v}
                            onClick={() => setData('amount', v)}
                            className={`rounded-full border px-3 py-1 text-sm ${data.amount === v ? 'border-brand bg-brand/10 text-brand' : 'border-line text-mute'}`}
                        >
                            {v === debt.remaining ? t('pay.all', { amount: mnt(v) }) : mnt(v)}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <span className="text-mute absolute top-1/2 left-3.5 -translate-y-1/2">₮</span>
                    <input
                        inputMode="numeric"
                        className="z-input pl-8"
                        value={data.amount.toLocaleString('en-US')}
                        onChange={(e) => setData('amount', Number(e.target.value.replace(/\D/g, '') || 0))}
                    />
                </div>
                {errors.amount && <p className="mt-1 text-sm text-rose-600">{errors.amount}</p>}
            </div>
            <label className="text-mute flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.anonymous} onChange={(e) => setData('anonymous', e.target.checked)} />
                {t('pay.anon')}
            </label>
            <div>
                <label className="z-label">{t('pay.message')}</label>
                <input
                    className="z-input"
                    maxLength={140}
                    placeholder={t('pay.messagePh')}
                    value={data.message}
                    onChange={(e) => setData('message', e.target.value)}
                />
            </div>
            {/* The donor covers the payment fee, so the request gets the whole donation. */}
            <dl className="bg-panel-2 space-y-1.5 rounded-xl p-3.5 text-sm">
                <div className="flex justify-between">
                    <dt className="text-mute">{t('pay.donation')}</dt>
                    <dd className="tabular-nums">{mnt(donation)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-mute">{t('pay.fee', { pct: feePercent })}</dt>
                    <dd className="tabular-nums">{mnt(fee)}</dd>
                </div>
                <div className="border-line flex justify-between border-t pt-1.5 font-semibold">
                    <dt>{t('pay.total')}</dt>
                    <dd className="tabular-nums">{mnt(donation + fee)}</dd>
                </div>
                <p className="text-mute pt-1 text-xs">{t('pay.feeNote', { name: debt.name })}</p>
            </dl>
            <button disabled={processing} className="btn-brand w-full">
                {processing ? t('pay.processing') : t('pay.submit', { amount: mnt(donation + fee) })}
            </button>
            <p className="text-mute text-center text-xs">{t('pay.demo')}</p>
        </form>
    );
}
