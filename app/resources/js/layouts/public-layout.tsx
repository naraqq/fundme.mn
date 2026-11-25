import LangSwitch from '@/components/zeel/lang-switch';
import { useT } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, type ReactNode } from 'react';

export default function PublicLayout({ title, children, wide = false }: { title?: string; children: ReactNode; wide?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const { t, locale } = useT();

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.classList.remove('dark'); // public site is always light
    }, [locale]);

    const navLink = 'text-mute hover:text-ink font-medium transition';

    return (
        <div className="bg-canvas text-ink min-h-screen">
            <Head title={title} />
            <header className="border-line sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
                <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
                    <Link href={route('home')} className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
                        <span className="bg-brand grid size-8 place-items-center rounded-lg text-base text-white">F</span>
                        <span>fundme.mn</span>
                    </Link>
                    <div className="hidden items-center gap-6 text-sm md:flex">
                        <Link href={route('discover')} className={navLink}>
                            {t('nav.discover')}
                        </Link>
                        <Link href={route('debts.index')} className={navLink}>
                            {t('nav.all')}
                        </Link>
                        <Link href={route('donors')} className={navLink}>
                            {t('nav.donors')}
                        </Link>
                        <Link href={route('companies')} className={navLink}>
                            {t('nav.companies')}
                        </Link>
                        <Link href={route('transparency')} className={navLink}>
                            {t('nav.transparency')}
                        </Link>
                    </div>
                    <div className="ml-auto flex items-center gap-3 text-sm sm:gap-4">
                        <LangSwitch className="text-mute" />
                        <Link href={auth.user ? route('dashboard') : route('login')} className={`${navLink} hidden sm:block`}>
                            {auth.user ? t('nav.account') : t('nav.login')}
                        </Link>
                        <Link href={route('debts.create')} className="btn-brand !px-4 !py-2 text-sm">
                            {t('nav.post')}
                        </Link>
                    </div>
                </nav>
            </header>

            <main className={wide ? '' : 'mx-auto max-w-6xl px-4'}>{children}</main>

            <footer className="border-line bg-panel-2 mt-24 border-t">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4">
                    <div>
                        <div className="flex items-center gap-2 text-lg font-extrabold">
                            <span className="bg-brand grid size-7 place-items-center rounded-lg text-sm text-white">F</span>
                            fundme.mn
                        </div>
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
