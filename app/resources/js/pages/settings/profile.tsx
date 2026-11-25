import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { type FormEvent, type ReactNode, useState } from 'react';

/** One page to edit what others see (name, city, bio, company details) and to delete the account. */
export default function EditProfile() {
    const { t } = useT();
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const isCompany = !!user.is_company;

    const { data, setData, post, errors, processing } = useForm<{
        _method: 'patch';
        name: string;
        city: string;
        bio: string;
        email: string;
        website: string;
        logo: File | null;
    }>({
        _method: 'patch',
        name: user.name,
        city: (user.city as string | null) ?? '',
        bio: (user.bio as string | null) ?? '',
        email: (user.email as string | null) ?? '',
        website: (user.website as string | null) ?? '',
        logo: null,
    });

    // Multipart (logo upload) needs POST with method spoofing.
    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('profile.update'), { forceFormData: true, preserveScroll: true });
    }

    const phone = user.phone as string | null;
    const logoPreview = data.logo ? URL.createObjectURL(data.logo) : (user.logo_url as string | null);

    return (
        <PublicLayout title={t('pf.edit')}>
            <div className="mx-auto max-w-2xl py-10">
                <header className="flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('pf.edit')}</h1>
                        <p className="text-mute mt-2 text-[15px]">{t('set.sub')}</p>
                    </div>
                    <Link href={route('users.show', user.id)} className="text-brand shrink-0 text-sm font-medium hover:underline">
                        {t('set.viewProfile')} →
                    </Link>
                </header>

                <form onSubmit={submit} className="border-line mt-8 space-y-5 rounded-xl border bg-white p-6">
                    <Field
                        label={isCompany ? t('pf.logo') : t('pf.photo')}
                        error={errors.logo}
                        hint={isCompany ? t('pf.logoHint') : t('pf.photoHint')}
                    >
                        <div className="flex items-center gap-4">
                            <span
                                className={`bg-panel-2 size-16 shrink-0 overflow-hidden ring-1 ring-black/5 ${isCompany ? 'rounded-xl' : 'rounded-full'}`}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="" className={`size-full ${isCompany ? 'bg-white object-contain' : 'object-cover'}`} />
                                ) : (
                                    <span className="bg-brand grid size-full place-items-center text-2xl font-bold text-white">
                                        {user.name.charAt(0)}
                                    </span>
                                )}
                            </span>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="text-mute file:bg-panel-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
                                onChange={(e) => setData('logo', e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </Field>

                    <Field label={t('set.name')} error={errors.name}>
                        <input className="z-input" value={data.name} onChange={(e) => setData('name', e.target.value)} required maxLength={60} />
                    </Field>

                    <Field label={t('pf.city')} error={errors.city}>
                        <input
                            className="z-input"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            placeholder={t('post.cityPh')}
                            maxLength={60}
                        />
                    </Field>

                    <Field label={t('pf.bio')} error={errors.bio} hint={`${data.bio.length}/160`}>
                        <textarea
                            className="z-input min-h-20 resize-y"
                            value={data.bio}
                            onChange={(e) => setData('bio', e.target.value)}
                            placeholder={t('pf.bioPh')}
                            maxLength={160}
                        />
                    </Field>

                    {isCompany && (
                        <>
                            <Field label={t('co.website')} error={errors.website}>
                                <input
                                    className="z-input"
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="example.mn"
                                />
                            </Field>
                        </>
                    )}

                    <div className="border-line border-t pt-5">
                        <h2 className="text-sm font-semibold">{t('set.private')}</h2>
                        <p className="text-mute mt-0.5 text-xs">{t('set.privateD')}</p>
                    </div>

                    {phone && (
                        <Field label={t('set.phone')} hint={t('set.phoneHint')}>
                            <input className="z-input bg-panel-2 text-mute" value={phone} disabled />
                        </Field>
                    )}

                    <Field label={t('set.email')} error={errors.email}>
                        <input
                            type="email"
                            className="z-input"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="name@example.com"
                        />
                    </Field>

                    <div className="flex justify-end pt-1">
                        <button disabled={processing} className="btn-brand !rounded-xl !px-6 !py-2.5 text-sm">
                            {t('set.save')}
                        </button>
                    </div>
                </form>

                <DeleteAccount />
            </div>
        </PublicLayout>
    );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="z-label">{label}</span>
            {children}
            {error ? (
                <span className="mt-1 block text-sm text-rose-600">{error}</span>
            ) : (
                hint && <span className="text-mute mt-1 block text-xs">{hint}</span>
            )}
        </label>
    );
}

function DeleteAccount() {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const form = useForm({ confirm: false as boolean });

    return (
        <section className="mt-8 rounded-xl border border-rose-200 p-6">
            <h2 className="font-semibold">{t('set.deleteTitle')}</h2>
            <p className="text-mute mt-1 text-sm leading-relaxed">{t('set.deleteD')}</p>

            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className="mt-4 text-sm font-semibold text-rose-600 hover:underline">
                    {t('set.deleteBtn')}…
                </button>
            ) : (
                <form
                    className="mt-4 space-y-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.delete(route('profile.destroy'));
                    }}
                >
                    <label className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.data.confirm}
                            onChange={(e) => form.setData('confirm', e.target.checked)}
                        />
                        {t('set.deleteConfirm')}
                    </label>
                    {form.errors.confirm && <p className="text-sm text-rose-600">{form.errors.confirm}</p>}
                    <div className="flex gap-2">
                        <button
                            disabled={!form.data.confirm || form.processing}
                            className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
                        >
                            {t('set.deleteBtn')}
                        </button>
                        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !rounded-lg !px-4 !py-2 text-sm">
                            {t('set.cancel')}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}
