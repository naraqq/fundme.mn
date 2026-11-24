import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { useT } from '@/lib/i18n';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const { t } = useT();
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm & { is_company: boolean; website: string }>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_company: false,
        website: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title={t('auth.registerTitle')} description={t('auth.registerDesc')}>
            <Head title={t('auth.signup')} />
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label>{t('reg.accountType')}</Label>
                        <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
                            {[
                                [false, `👤 ${t('reg.person')}`],
                                [true, `🏢 ${t('reg.company')}`],
                            ].map(([val, label]) => (
                                <button
                                    key={String(val)}
                                    type="button"
                                    onClick={() => setData('is_company', val as boolean)}
                                    className={`rounded-md py-1.5 text-sm font-medium transition ${data.is_company === val ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">{data.is_company ? t('reg.companyName') : t('auth.name')}</Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete={data.is_company ? 'organization' : 'name'}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder={data.is_company ? t('reg.companyNamePh') : t('auth.fullName')}
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    {data.is_company && (
                        <div className="grid gap-2">
                            <Label htmlFor="website">{t('reg.website')}</Label>
                            <Input
                                id="website"
                                type="text"
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                disabled={processing}
                                placeholder="example.mn"
                            />
                            <p className="text-muted-foreground text-xs">{t('reg.companyNote')}</p>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('auth.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="email@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">{t('auth.password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={3}
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            disabled={processing}
                            placeholder={t('auth.password')}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">{t('auth.confirm')}</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            required
                            tabIndex={4}
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            disabled={processing}
                            placeholder={t('auth.confirm')}
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="mt-2 w-full" tabIndex={5} disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {t('auth.create')}
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-sm">
                    {t('auth.haveAccount')}{' '}
                    <TextLink href={route('login')} tabIndex={6}>
                        {t('auth.login')}
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
