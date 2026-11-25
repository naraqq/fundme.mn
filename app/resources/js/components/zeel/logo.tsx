/**
 * fundme.mn logo, cut from the master artwork (fundme.mn-logo.png in the repo root):
 * the heart-and-handshake mark plus the "fundme.mn" wordmark, or the mark alone.
 */
export default function Logo({ mark = false, className = '' }: { mark?: boolean; className?: string }) {
    if (mark) {
        return <img src="/brand/logo-mark.png" alt="fundme.mn" className={`h-9 w-auto ${className}`} />;
    }
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <img src="/brand/logo-mark.png" alt="" aria-hidden className="h-8 w-auto" />
            <img src="/brand/logo-wordmark.png" alt="fundme.mn" className="h-[22px] w-auto" />
        </span>
    );
}
