import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { CATEGORIES, type Category } from '@/lib/zeel';
import { useForm } from '@inertiajs/react';
import { type FormEvent, type ReactNode } from 'react';

export default function CreateDebt() {
    const { t } = useT();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        age: '',
        city: '',
        category: 'loan' as Category,
        amount: '',
        creditor: '',
        title: '',
        story: '',
        bill: null as File | null,
        photo: null as File | null,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('debts.store'), { forceFormData: true });
    }

    const field = (key: keyof typeof data, label: string, input: ReactNode) => (
        <div>
            <label className="z-label">{label}</label>
            {input}
            {errors[key] && <p className="mt-1 text-sm text-rose-600">{errors[key]}</p>}
        </div>
    );
    const text = (key: Exclude<keyof typeof data, 'bill' | 'photo'>, props: Record<string, unknown> = {}) => (
        <input className="z-input" value={data[key]} onChange={(e) => setData(key, e.target.value)} {...props} />
    );

    return (
        <PublicLayout title={t('post.title')}>
            <div className="mx-auto max-w-2xl py-10">
                <h1 className="text-3xl font-bold">{t('post.title')}</h1>
                <p className="text-mute mt-2">{t('post.intro')}</p>

                <form onSubmit={submit} className="z-card mt-8 space-y-5 p-6 sm:p-8">
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
                                    className={`bg-panel-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${data.category === c.value ? 'border-brand text-brand' : 'border-line'}`}
                                >
                                    {c.emoji} {t(`cat.${c.value}`)}
                                </button>
                            ))}
                        </div>,
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {field(
                            'amount',
                            t('post.amount'),
                            <input
                                className="z-input"
                                inputMode="numeric"
                                placeholder="2,500,000"
                                required
                                value={data.amount ? Number(data.amount).toLocaleString('en-US') : ''}
                                onChange={(e) => setData('amount', e.target.value.replace(/\D/g, ''))}
                            />,
                        )}
                        {field('creditor', t('post.creditor'), text('creditor', { required: true, placeholder: t('post.creditorPh') }))}
                    </div>

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
                        <label className="border-line hover:border-brand/60 block cursor-pointer rounded-xl border border-dashed p-4 text-sm transition">
                            <input
                                type="file"
                                accept="image/*"
                                className="file:bg-brand-soft file:text-brand text-mute w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1.5 file:font-semibold"
                                onChange={(e) => setData('photo', e.target.files?.[0] ?? null)}
                            />
                            <span className="text-mute mt-2 block text-xs">📷 {t('post.photoHint')}</span>
                        </label>,
                    )}

                    {field(
                        'bill',
                        t('post.bill'),
                        <label className="border-line hover:border-brand/60 block cursor-pointer rounded-xl border border-dashed p-4 text-sm transition">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                required
                                className="file:bg-panel-2 file:text-ink text-mute w-full text-sm file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1.5"
                                onChange={(e) => setData('bill', e.target.files?.[0] ?? null)}
                            />
                            <span className="text-mute mt-2 block text-xs">🔒 {t('post.billHint')}</span>
                        </label>,
                    )}

                    <button disabled={processing} className="btn-brand w-full">
                        {processing ? t('post.posting') : t('nav.post')}
                    </button>
                </form>
            </div>
        </PublicLayout>
    );
}
