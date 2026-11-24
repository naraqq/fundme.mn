import { setLocale, useT, type Locale } from '@/lib/i18n';

export default function LangSwitch({ className = '' }: { className?: string }) {
    const { locale } = useT();
    const opts: [Locale, string][] = [
        ['mn', 'МН'],
        ['en', 'EN'],
    ];
    return (
        <div className={`flex overflow-hidden rounded-full border border-current/20 text-xs ${className}`}>
            {opts.map(([l, label]) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => l !== locale && setLocale(l)}
                    className={`px-2.5 py-1 font-semibold transition ${l === locale ? 'bg-brand text-white' : 'opacity-60 hover:opacity-100'}`}
                    aria-pressed={l === locale}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
