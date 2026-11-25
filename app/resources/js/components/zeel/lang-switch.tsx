import { setLocale, useT, type Locale } from '@/lib/i18n';

/** Quiet МН / EN toggle: a grey track with the active language raised. */
export default function LangSwitch({ className = '' }: { className?: string }) {
    const { locale } = useT();
    const opts: [Locale, string][] = [
        ['mn', 'МН'],
        ['en', 'EN'],
    ];
    return (
        <div className={`bg-panel-2 flex rounded-lg p-0.5 text-xs ${className}`}>
            {opts.map(([l, label]) => (
                <button
                    key={l}
                    type="button"
                    onClick={() => l !== locale && setLocale(l)}
                    className={`rounded-md px-2 py-1 font-semibold transition ${l === locale ? 'text-ink bg-white shadow-sm' : 'text-mute hover:text-ink'}`}
                    aria-pressed={l === locale}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
