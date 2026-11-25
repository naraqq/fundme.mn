import LangSwitch from '@/components/zeel/lang-switch';
import Logo from '@/components/zeel/logo';
import { UserAvatar } from '@/components/zeel/people';
import { useT } from '@/lib/i18n';
import { type SharedData } from '@/types';

type AvatarUser = Parameters<typeof UserAvatar>[0]['user'];
import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, Plus, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export default function PublicLayout({ title, children, wide = false }: { title?: string; children: ReactNode; wide?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const { t, locale } = useT();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.classList.remove('dark'); // public site is always light
    }, [locale]);

    const links: [string, string][] = [
        ['discover', t('nav.discover')],
        ['debts.index', t('nav.all')],
        ['donors', t('nav.donors')],
        ['companies', t('nav.companies')],
        ['transparency', t('nav.transparency')],
    ];
    const isActive = (name: string) => route().current(name) || (name === 'debts.index' && route().current('debts.show'));

    return (
        <div className="bg-canvas text-ink min-h-screen">
            <Head title={title} />
            <header className="border-line sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
                <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
                    <Link href={route('home')} className="shrink-0" aria-label="fundme.mn">
                        <Logo />
                    </Link>

                    <div className="hidden h-full items-stretch gap-6 text-sm lg:flex">
                        {links.map(([name, label]) => (
                            <Link
                                key={name}
                                href={route(name)}
                                className={`relative flex items-center font-medium transition ${isActive(name) ? 'text-ink after:bg-brand after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full' : 'text-ink/60 hover:text-ink'}`}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <LangSwitch className="hidden sm:flex" />
                        {auth.user ? (
                            <Link href={route('dashboard')} title={t('nav.account')} className="rounded-full ring-offset-2 transition hover:ring-2 hover:ring-brand/30">
                                <UserAvatar user={auth.user as AvatarUser} size={34} />
                            </Link>
                        ) : (
                            <Link href={route('login')} className="text-ink/70 hover:text-ink hidden text-sm font-medium sm:block">
                                {t('nav.login')}
                            </Link>
                        )}
                        <Link href={route('debts.create')} className="btn-brand !px-4 !py-2 text-sm">
                            <Plus className="size-4" aria-hidden /> <span>{t('nav.post')}</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            className="text-ink hover:bg-panel-2 -mr-2 grid size-9 place-items-center rounded-lg lg:hidden"
                            aria-label="Menu"
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </nav>

                {/* Phones and tablets: links in a drop-down panel */}
                {menuOpen && (
                    <div className="border-line border-t bg-white lg:hidden">
                        <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
                            {links.map(([name, label]) => (
                                <Link
                                    key={name}
                                    href={route(name)}
                                    className={`rounded-lg px-3 py-2.5 font-medium ${isActive(name) ? 'bg-brand-soft text-brand' : 'hover:bg-panel-2'}`}
                                >
                                    {label}
                                </Link>
                            ))}
                            <div className="border-line mt-2 flex items-center justify-between border-t px-3 pt-3 pb-1">
                                {auth.user ? (
                                    <Link href={route('dashboard')} className="font-medium">
                                        {t('nav.account')}
                                    </Link>
                                ) : (
                                    <Link href={route('login')} className="font-medium">
                                        {t('nav.login')}
                                    </Link>
                                )}
                                <LangSwitch />
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className={wide ? '' : 'mx-auto max-w-6xl px-4'}>{children}</main>

            <footer className="border-line bg-panel-2 mt-24 border-t">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <Logo />
                        <p className="text-mute mt-3 text-xs leading-relaxed">{t('footer')}</p>
                    </div>
                    <FooterCol title={t('foot.help')}>
                        <Link href={route('debts.create')}>{t('nav.post')}</Link>
                        <Link href={route('login')}>{t('nav.login')}</Link>
                    </FooterCol>
                    <FooterCol title={t('foot.give')}>
                        <Link href={route('discover')}>{t('nav.discover')}</Link>
                        <Link href={route('debts.index')}>{t('nav.all')}</Link>
                        <Link href={route('donors')}>{t('nav.donors')}</Link>
                        <Link href={route('companies')}>{t('nav.companies')}</Link>
                    </FooterCol>
                    <FooterCol title={t('foot.trust')}>
                        <Link href={route('transparency')}>{t('nav.transparency')}</Link>
                        <Link href={route('verify')}>{t('nav.verify')}</Link>
                    </FooterCol>
                </div>
            </footer>
        </div>
    );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <div className="mb-3 font-semibold">{title}</div>
            <div className="text-mute [&>a:hover]:text-ink flex flex-col gap-2">{children}</div>
        </div>
    );
}
