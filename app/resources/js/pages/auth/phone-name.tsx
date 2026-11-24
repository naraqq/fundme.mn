import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export default function PhoneName({ phone }: { phone: string }) {
    const { t } = useT();
    const { data, setData, post, processing, errors } = useForm({ name: '', is_company: false as boolean, website: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('login.phone.name.store'));
    }

    return (
        <PublicLayout title={t('ph.create')}>
            <div className="mx-auto max-w-md py-12 sm:py-16">
                <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">✅</div>
                <h1 className="text-center text-3xl font-extrabold tracking-tight">{t('ph.nameTitle')}</h1>
                <p className="text-mute mt-2 text-center text-sm">{t('ph.nameSub', { phone })}</p>

                <form onSubmit={submit} className="z-card mt-8 space-y-4 p-6 sm:p-7">
                    <div>
                        <label className="z-label">{t('reg.accountType')}</label>
                        <div className="bg-panel-2 grid grid-cols-2 gap-1 rounded-xl p-1">
                            {[
                                [false, `👤 ${t('reg.person')}`],
                                [true, `🏢 ${t('reg.company')}`],
                            ].map(([val, label]) => (
                                <button
                                    key={String(val)}
                                    type="button"
                                    onClick={() => setData('is_company', val as boolean)}
                                    className={`rounded-lg py-2 text-sm font-semibold transition ${data.is_company === val ? 'text-brand bg-white shadow-sm' : 'text-mute'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="name" className="z-label">
                            {data.is_company ? t('reg.companyName') : t('ph.name')}
                        </label>
                        <input
                            id="name"
                            className="z-input py-3 text-lg"
                            autoFocus
                            required
                            maxLength={60}
                            autoComplete={data.is_company ? 'organization' : 'name'}
                            placeholder={data.is_company ? t('reg.companyNamePh') : t('ph.namePh')}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        {errors.name && <p className="mt-1.5 text-sm text-rose-600">{errors.name}</p>}
                    </div>

                    {data.is_company && (
                        <div>
                            <label htmlFor="website" className="z-label">
                                {t('reg.website')}
                            </label>
                            <input
                                id="website"
                                className="z-input"
                                placeholder="example.mn"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                            />
                            <p className="text-mute mt-1.5 text-xs">{t('reg.companyNote')}</p>
                        </div>
                    )}

                    <button disabled={processing || !data.name.trim()} className="btn-brand w-full py-3 text-base">
                        {t('ph.create')}
                    </button>
                </form>
            </div>
        </PublicLayout>
    );
}
