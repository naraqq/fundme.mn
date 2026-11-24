import { useT } from '@/lib/i18n';
import { mnt, type Debt } from '@/lib/zeel';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function PayForm({ debt }: { debt: Debt }) {
    const { t } = useT();
    // Three suggestions below what's left (₮5k… for lunch money, ₮1M for big loans), plus "all".
    const presets = [5_000, 10_000, 20_000, 50_000, 200_000, 1_000_000].filter((v) => v < debt.remaining).slice(-3);
    const { data, setData, post, processing, errors } = useForm({
        amount: debt.remaining <= 100_000 ? debt.remaining : (presets[0] ?? debt.remaining),
        anonymous: false as boolean,
        message: '',
    });

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
            <button disabled={processing} className="btn-brand w-full">
                {processing ? t('pay.processing') : t('pay.submit', { amount: mnt(Math.min(data.amount, debt.remaining)) })}
            </button>
            <p className="text-mute text-center text-xs">{t('pay.demo')}</p>
        </form>
    );
}
