import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { mnt } from '@/lib/zeel';
import { Link, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

type Result = {
    code: string;
    amount: number;
    reference: string;
    paid_at: string;
    has_receipt: boolean;
    debt: { id: number; name: string; title: string };
} | null;

export default function Verify({ code, result }: { code: string; result: Result }) {
    const { t } = useT();
    const [value, setValue] = useState(code);

    function submit(e: FormEvent) {
        e.preventDefault();
        router.get(route('verify'), { code: value.trim() }, { preserveState: true });
    }

    return (
        <PublicLayout title={t('vf.title')}>
            <div className="mx-auto max-w-xl py-10">
                <h1 className="text-3xl font-bold">{t('vf.title')}</h1>
                <p className="text-mute mt-2">{t('vf.sub')}</p>

                <form onSubmit={submit} className="mt-6 flex gap-2">
                    <input
                        className="z-input font-mono tracking-wider uppercase"
                        placeholder="FM-XXXXXXXX"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />
                    <button className="btn-brand shrink-0">{t('vf.check')}</button>
                </form>

                {code && result && (
                    <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
                        <div className="flex items-center gap-2 font-semibold text-emerald-700">✅ {t('vf.ok')}</div>
                        <code className="text-mute mt-1 block font-mono text-sm">{result.code}</code>
                        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                            <dt className="text-mute">{t('vf.amount')}</dt>
                            <dd className="text-lg font-bold">{mnt(result.amount)}</dd>
                            <dt className="text-mute">{t('vf.to')}</dt>
                            <dd>{result.debt.name}</dd>
                            <dt className="text-mute">{t('vf.for')}</dt>
                            <dd>
                                <Link href={route('debts.show', result.debt.id)} className="text-brand hover:text-brand-2">
                                    {result.debt.title}
                                </Link>
                            </dd>
                            <dt className="text-mute">{t('vf.date')}</dt>
                            <dd>{fmtDate(result.paid_at)}</dd>
                            <dt className="text-mute">{t('vf.ref')}</dt>
                            <dd className="font-mono">{result.reference}</dd>
                        </dl>
                        {result.has_receipt && (
                            <a href={route('receipts.show', result.code)} target="_blank" className="btn-ghost mt-6 text-sm">
                                🧾 {t('show.viewReceipt')}
                            </a>
                        )}
                    </div>
                )}
                {code && !result && (
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        {t('vf.notFound', { code })}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
