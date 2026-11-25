import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, mnt, type Category } from '@/lib/zeel';
import { Link, useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

type Active = { id: number; title: string; phase: string };

export default function CreateDebt({ banks, active, newAccountMax }: { banks: string[]; active: Active | null; newAccountMax: number | null }) {
    if (active) return <ActiveRequest active={active} />;
    return <RequestForm banks={banks} newAccountMax={newAccountMax} />;
}

/** One request at a time: point people to the one they already have. */
function ActiveRequest({ active }: { active: Active }) {
    const { t } = useT();
    return (
        <PublicLayout title={t('post.title')}>
            <div className="mx-auto max-w-xl py-16">
                <div className="border-line rounded-xl border bg-white p-8 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">{t('post.activeTitle')}</h1>
                    <p className="text-mute mt-2">{t('post.activeD')}</p>
                    <Link href={route('debts.show', active.id)} className="bg-panel-2 hover:bg-line mt-6 block rounded-lg px-4 py-3 font-medium transition">
                        {active.title} →
                    </Link>
                </div>
            </div>
        </PublicLayout>
    );
}

function RequestForm({ banks, newAccountMax }: { banks: string[]; newAccountMax: number | null }) {
    const { t } = useT();
    const { data, setData, post, processing, errors: formErrors } = useForm({
        name: '',
        age: '',
        city: '',
        category: 'loan' as Category,
        amount: '',
        title: '',
        story: '',
        bank_name: '',
        bank_account: '',
        account_holder: '',
        bill: null as File | null,
        photo: null as File | null,
    });
    const errors = formErrors as typeof formErrors & { active?: string };

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('debts.store'), { forceFormData: true });
    }

    const field = (key: keyof typeof data, label: string, input: ReactNode, hint?: string) => (
        <div>
            <label className="z-label">{label}</label>
            {input}
            {errors[key] ? <p className="mt-1 text-sm text-rose-600">{errors[key]}</p> : hint && <p className="text-mute mt-1 text-xs">{hint}</p>}
        </div>
    );
    const text = (key: Exclude<keyof typeof data, 'bill' | 'photo'>, props: Record<string, unknown> = {}) => (
        <input className="z-input" value={data[key]} onChange={(e) => setData(key, e.target.value)} {...props} />
    );
    const fileInput = 'text-mute w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-panel-2 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink';

    return (
        <PublicLayout title={t('post.title')}>
            <div className="mx-auto max-w-2xl py-10">
                <h1 className="text-3xl font-bold tracking-tight">{t('post.title')}</h1>
                <p className="text-mute mt-2">{t('post.intro')}</p>

                <form onSubmit={submit} className="mt-8 space-y-6">
                    {/* About the request: public */}
                    <section className="border-line space-y-5 rounded-xl border bg-white p-6">
                        <div className="grid gap-4 sm:grid-cols-[1fr_100px_1fr]">
                            {field('name', t('post.name'), text('name', { required: true }))}
                            {field('age', t('post.age'), text('age', { type: 'number', min: 16, max: 120 }))}
                            {field('city', t('post.city'), text('city', { required: true, placeholder: t('post.cityPh') }))}
                        </div>

                        {field(
                            'category',
                            t('post.kind'),
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {CATEGORIES.map((c) => (
                                    <button
                                        type="button"
                                        key={c.value}
                                        onClick={() => setData('category', c.value)}
                                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${data.category === c.value ? 'border-brand bg-brand-soft text-brand font-medium' : 'border-line hover:border-ink/30 bg-white'}`}
                                    >
                                        {t(`cat.${c.value}`)}
                                    </button>
                                ))}
                            </div>,
                        )}

                        {field(
                            'amount',
                            t('post.amount'),
                            <input
                                className="z-input sm:max-w-60"
                                inputMode="numeric"
                                placeholder="2,500,000"
                                required
                                value={data.amount ? Number(data.amount).toLocaleString('en-US') : ''}
                                onChange={(e) => setData('amount', e.target.value.replace(/\D/g, ''))}
                            />,
                            newAccountMax ? t('post.newAccountMax', { amount: mnt(newAccountMax) }) : undefined,
                        )}

                        {field('title', t('post.headline'), text('title', { required: true, maxLength: 70, placeholder: t('post.headlinePh') }))}
                        {field(
                            'story',
                            t('post.story'),
                            <textarea
                                rows={5}
                                className="z-input resize-y"
                                required
                                placeholder={t('post.storyPh')}
                                value={data.story}
                                onChange={(e) => setData('story', e.target.value)}
                            />,
                        )}

                        {field(
                            'photo',
                            t('post.photo'),
                            <input type="file" accept="image/*" className={fileInput} onChange={(e) => setData('photo', e.target.files?.[0] ?? null)} />,
                            t('post.photoHint'),
                        )}
                    </section>

                    {/* Payout + supporting document: private, admins only */}
                    <section className="border-line space-y-5 rounded-xl border bg-white p-6">
                        <div>
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Lock className="text-mute size-4" aria-hidden /> {t('post.bankTitle')}
                            </h2>
                            <p className="text-mute mt-1 text-sm">{t('post.bankHint')}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {field(
                                'bank_name',
                                t('post.bankName'),
                                <select className="z-input" required value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)}>
                                    <option value="" disabled>
                                        —
                                    </option>
                                    {banks.map((b) => (
                                        <option key={b} value={b}>
                                            {b}
                                        </option>
                                    ))}
                                </select>,
                            )}
                            {field('bank_account', t('post.bankAccount'), text('bank_account', { required: true, inputMode: 'numeric', placeholder: '5000123456' }))}
                        </div>
                        {field('account_holder', t('post.accountHolder'), text('account_holder', { required: true, placeholder: t('post.accountHolderPh') }))}

                        {field(
                            'bill',
                            t('post.bill'),
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className={fileInput} onChange={(e) => setData('bill', e.target.files?.[0] ?? null)} />,
                            t('post.billHint'),
                        )}
                    </section>

                    {errors.active && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{errors.active}</p>}
                    <button disabled={processing} className="btn-brand w-full !rounded-xl !py-3">
                        {processing ? t('post.posting') : t('nav.post')}
                    </button>
                </form>
            </div>
        </PublicLayout>
    );
}
