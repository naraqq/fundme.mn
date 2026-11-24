import PublicLayout from '@/layouts/public-layout';
import { useT } from '@/lib/i18n';
import { Link } from '@inertiajs/react';

export default function Guarantee() {
    const { t } = useT();
    const promises = [
        ['🔍', 'gu.p1t', 'gu.p1d'],
        ['🏦', 'gu.p2t', 'gu.p2d'],
        ['🧾', 'gu.p3t', 'gu.p3d'],
        ['↩️', 'gu.p4t', 'gu.p4d'],
    ] as const;

    return (
        <PublicLayout title={t('nav.guarantee')} wide>
            <section className="from-brand-soft bg-gradient-to-b to-white">
                <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
                    <div className="text-6xl">🛡️</div>
                    <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">fundme.mn {t('nav.guarantee').toLowerCase()}</h1>
                    <p className="text-mute mx-auto mt-5 max-w-xl text-lg">{t('gu.lead')}</p>
                </div>
            </section>

            <div className="mx-auto max-w-5xl px-4">
                <div className="grid gap-5 sm:grid-cols-2">
                    {promises.map(([icon, title, desc]) => (
                        <div key={title} className="z-card p-6">
                            <div className="bg-brand-soft grid size-12 place-items-center rounded-xl text-2xl">{icon}</div>
                            <h2 className="mt-4 text-lg font-bold">{t(title)}</h2>
                            <p className="text-mute mt-2 text-sm leading-relaxed">{t(desc)}</p>
                        </div>
                    ))}
                </div>

                <section className="mt-16">
                    <h2 className="mb-6 text-center text-2xl font-extrabold">{t('gu.howTitle')}</h2>
                    <ol className="grid gap-5 sm:grid-cols-3">
                        {(['gu.h1', 'gu.h2', 'gu.h3'] as const).map((k, i) => (
                            <li key={k} className="text-center">
                                <div className="bg-brand mx-auto grid size-10 place-items-center rounded-full font-bold text-white">{i + 1}</div>
                                <p className="mt-3 text-sm font-medium">{t(k)}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="mt-14 flex flex-wrap justify-center gap-3">
                    <Link href={route('transparency')} className="btn-ghost">
                        {t('nav.transparency')}
                    </Link>
                    <Link href={route('verify')} className="btn-ghost">
                        {t('nav.verify')}
                    </Link>
                    <Link href={route('discover')} className="btn-brand">
                        {t('home.ctaPay')}
                    </Link>
                </div>

                <p className="mx-auto mt-10 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800">{t('gu.note')}</p>
            </div>
        </PublicLayout>
    );
}
