import { useT } from '@/lib/i18n';
import { useState } from 'react';

/** Problem 4: a permanent page people can keep re-sharing, instead of a post that sinks in a feed. */
export default function ShareBar({ url, title }: { url: string; title: string }) {
    const { t } = useT();
    const [copied, setCopied] = useState(false);
    const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            window.prompt(t('share.copy'), url);
        }
    }

    const btn = 'border-line hover:border-mute rounded-full border px-3 py-1.5 text-sm transition';

    return (
        <div className="border-line bg-panel rounded-3xl border p-5">
            <div className="text-mute mb-3 text-sm">{t('share.title')}</div>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copy} className={btn}>
                    {copied ? t('share.copied') : `🔗 ${t('share.copy')}`}
                </button>
                <a
                    className={btn}
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                >
                    Facebook
                </a>
                {canNativeShare && (
                    <button type="button" className={btn} onClick={() => navigator.share({ title, url }).catch(() => {})}>
                        {t('share.more')}
                    </button>
                )}
            </div>
        </div>
    );
}
