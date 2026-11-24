import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { useT } from '@/lib/i18n';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const { t } = useT();

    const isCompany = !!auth.user.is_company;
    const { data, setData, post, errors, processing, recentlySuccessful } = useForm<{
        _method: string;
        name: string;
        email: string | null;
        city: string;
        bio: string;
        website: string;
        logo: File | null;
    }>({
        _method: 'patch',
        name: auth.user.name,
        email: auth.user.email,
        city: auth.user.city ?? '',
        bio: auth.user.bio ?? '',
        website: auth.user.website ?? '',
        logo: null,
    });

    // Multipart (logo) needs POST + method spoofing; Inertia reads _method.
    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('profile.update'), { forceFormData: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name and email address" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="city">{t('pf.city')}</Label>
                            <Input
                                id="city"
                                className="mt-1 block w-full"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                placeholder={t('post.cityPh')}
                            />
                            <InputError className="mt-2" message={errors.city} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="bio">{t('pf.bio')}</Label>
                            <Input
                                id="bio"
                                className="mt-1 block w-full"
                                value={data.bio}
                                maxLength={160}
                                onChange={(e) => setData('bio', e.target.value)}
                                placeholder={t('pf.bioPh')}
                            />
                            <InputError className="mt-2" message={errors.bio} />
                        </div>

                        {isCompany && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="website">{t('co.website')}</Label>
                                    <Input
                                        id="website"
                                        className="mt-1 block w-full"
                                        value={data.website}
                                        onChange={(e) => setData('website', e.target.value)}
                                        placeholder="example.mn"
                                    />
                                    <InputError className="mt-2" message={errors.website} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="logo">{t('pf.logo')}</Label>
                                    <div className="flex items-center gap-4">
                                        <span className="bg-muted size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5">
                                            {data.logo ? (
                                                <img src={URL.createObjectURL(data.logo)} alt="" className="size-full object-contain" />
                                            ) : auth.user.logo_url ? (
                                                <img src={auth.user.logo_url} alt="" className="size-full object-contain" />
                                            ) : (
                                                <span className="bg-brand grid size-full place-items-center text-2xl font-bold text-white">
                                                    {auth.user.name.charAt(0)}
                                                </span>
                                            )}
                                        </span>
                                        <Input
                                            id="logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="text-sm"
                                            onChange={(e) => setData('logo', e.target.files?.[0] ?? null)}
                                        />
                                    </div>
                                    <p className="text-muted-foreground text-xs">{t('pf.logoHint')}</p>
                                    <InputError className="mt-2" message={errors.logo} />
                                </div>
                            </>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email ?? ''}
                                onChange={(e) => setData('email', e.target.value)}
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    Your email address is unverified.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
