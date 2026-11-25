import LangSwitch from '@/components/zeel/lang-switch';
import Logo from '@/components/zeel/logo';
import { UserAvatar } from '@/components/zeel/people';
import { useT } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight, Menu, Plus, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

type AvatarUser = Parameters<typeof UserAvatar>[0]['user'];

export default function PublicLayout({ title, children, wide = false }: { title?: string; children: ReactNode; wide?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const { t, locale } = useT();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.classList.remove('dark'); // public site is always light
    }, [locale]);

    // The phone menu covers the page: stop the page behind it from scrolling.
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    const links: [string, string][] = [
        ['discover', t('nav.discover')],
        ['debts.index', t('nav.all')],
        ['donors', t('nav.donors')],
        ['companies', t('nav.companies')],
        ['transparency', t('nav.transparency')],
    ];
    const isActive = (name: string) => route().current(name) || (name === 'debts.index' && route().current('debts.show'));
    const user = auth.user as (AvatarUser & { name: string }) | null;

    return (
        <div className="bg-canvas text-ink min-h-screen">
            <Head title={title} />
            <header className="border-line sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
                <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
                    <Link href={route('home')} className="shrink-0" aria-label="fundme.mn">
                        <Logo />
                    </Link>

                    <div className="hidden h-full items-stretch gap-6 text-sm xl:flex">
                        {links.map(([name, label]) => (
                            <Link
                                key={name}
                                href={route(name)}
                                className={`relative flex items-center font-medium whitespace-nowrap transition ${isActive(name) ? 'text-ink after:bg-brand after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full' : 'text-ink/60 hover:text-ink'}`}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <LangSwitch className="hidden xl:flex" />
                        {user ? (
                            <Link href={route('dashboard')} title={t('nav.account')} className="hover:ring-brand/30 rounded-full transition hover:ring-2">
                                <UserAvatar user={user} size={32} />
                            </Link>
                        ) : (
                            <Link href={route('login')} className="text-ink/70 hover:text-ink hidden text-sm font-medium whitespace-nowrap sm:block">
                                {t('nav.login')}
                            </Link>
                        )}
                        {/* On phones the main action lives at the top of the menu, so the bar never overflows. */}
                        <Link href={route('debts.create')} className="btn-brand hidden !px-4 !py-2 text-sm whitespace-nowrap sm:inline-flex">
                            <Plus className="size-4" aria-hidden /> {t('nav.post')}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            className="text-ink hover:bg-panel-2 -mr-2 grid size-10 shrink-0 place-items-center rounded-lg xl:hidden"
                            aria-label="Menu"
                            aria-expanded={menuOpen}
                        >
                            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                        </button>
                    </div>
                </nav>

            </header>
        {/* Phones and tablets: a full-height menu sheet under the bar (outside <header>: its blur would trap position:fixed) */}
            {menuOpen && (
                <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-white xl:hidden">
                    <div className="mx-auto flex max-w-xl flex-col px-4 pt-4 pb-10">
                        <Link href={route('debts.create')} className="btn-brand w-full !rounded-xl !py-3.5 text-base">
                            <Plus className="size-5" aria-hidden /> {t('nav.post')}
                        </Link>

                        <nav className="mt-4">
                            {links.map(([name, label]) => (
                                <Link
                                    key={name}
                                    href={route(name)}
                                    className={`border-line flex items-center justify-between border-b py-4 text-lg font-medium ${isActive(name) ? 'text-brand' : ''}`}
                                >
                                    {label}
                                    <ChevronRight className="text-mute size-5" aria-hidden />
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-6">
                            {user ? (
                                <Link href={route('dashboard')} className="bg-panel-2 flex items-center gap-3 rounded-xl p-3">
                                    <UserAvatar user={user} size={40} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{user.name}</span>
                                        <span className="text-mute text-sm">{t('nav.account')}</span>
                                    </span>
                                    <ChevronRight className="text-mute size-5" aria-hidden />
                                </Link>
                            ) : (
                                <Link href={route('login')} className="btn-ghost w-full !rounded-xl !py-3 text-base">
                                    {t('nav.login')}
                                </Link>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <span className="text-mute text-sm">{t('nav.language')}</span>
                            <LangSwitch />
                        </div>
                    </div>
                </div>
            )}

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
