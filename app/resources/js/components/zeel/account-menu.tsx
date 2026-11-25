import { useT } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { LayoutDashboard, LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from './people';

type AccountUser = Parameters<typeof UserAvatar>[0]['user'] & { name: string; is_admin?: boolean };

/** The signed-in user's links, shared by the desktop avatar menu and the phone menu sheet. */
export function AccountLinks({ user, onPick, large = false }: { user: AccountUser; onPick?: () => void; large?: boolean }) {
    const { t } = useT();
    const item = `flex w-full items-center gap-3 rounded-lg px-3 text-left transition hover:bg-panel-2 ${large ? 'py-3 text-base' : 'py-2 text-sm'}`;
    const icon = large ? 'size-5 text-mute' : 'size-4 text-mute';

    return (
        <>
            <Link href={route('dashboard')} className={item} onClick={onPick}>
                <LayoutDashboard className={icon} aria-hidden /> {t('nav.account')}
            </Link>
            <Link href={route('users.show', user.id)} className={item} onClick={onPick}>
                <UserRound className={icon} aria-hidden /> {t('pf.myProfile')}
            </Link>
            <Link href={route('profile.edit')} className={item} onClick={onPick}>
                <Settings className={icon} aria-hidden /> {t('dash.settings')}
            </Link>
            {user.is_admin && (
                <Link href={route('admin.index')} className={item} onClick={onPick}>
                    <ShieldCheck className={icon} aria-hidden /> {t('nav.admin')}
                </Link>
            )}
            <div className="border-line my-1 border-t" />
            <Link href={route('logout')} method="post" as="button" className={`${item} text-rose-600`} onClick={onPick}>
                <LogOut className={`${large ? 'size-5' : 'size-4'}`} aria-hidden /> {t('nav.logout')}
            </Link>
        </>
    );
}

/** Desktop: the avatar opens a small menu (closes on outside click or Escape). */
export default function AccountMenu({ user }: { user: AccountUser }) {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="hover:ring-brand/30 block rounded-full transition hover:ring-2"
                aria-haspopup="menu"
                aria-expanded={open}
                title={t('nav.account')}
            >
                <UserAvatar user={user} size={32} />
            </button>
            {open && (
                <div role="menu" className="border-line absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border bg-white p-1.5 shadow-xl shadow-slate-900/10">
                    <div className="border-line mb-1 border-b px-3 pt-1.5 pb-2.5">
                        <div className="truncate font-semibold">{user.name}</div>
                    </div>
                    <AccountLinks user={user} onPick={() => setOpen(false)} />
                </div>
            )}
        </div>
    );
}
