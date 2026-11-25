import { fmtDate, useT } from '@/lib/i18n';
import { mnt, type Payment } from '@/lib/zeel';
import { type SharedData } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Heart, Trash2 } from 'lucide-react';
import { NameWithBadge, UserAvatar } from './people';

export type CommentItem = {
    id: number;
    body: string;
    at: string;
    user: { id: number; name: string; is_company?: boolean; company_verified?: boolean; logo_url?: string | null } | null;
    role: 'owner' | 'donor' | null;
    canDelete: boolean;
};

type Entry = { kind: 'comment'; at: string; c: CommentItem } | { kind: 'gift'; at: string; p: Payment };

/** "2 цагийн өмнө" style time from our own strings (browsers have no Mongolian for this); dates after a week. */
export function useAgo() {
    const { t } = useT();
    return (iso: string) => {
        const s = (Date.now() - new Date(iso).getTime()) / 1000;
        if (s < 60) return t('time.now');
        if (s < 3600) return t('time.min', { n: Math.floor(s / 60) });
        if (s < 86400) return t('time.hour', { n: Math.floor(s / 3600) });
        if (s < 7 * 86400) return t('time.day', { n: Math.floor(s / 86400) });
        return fmtDate(iso);
    };
}

/**
 * One conversation per request: comments from anyone signed in, plus the messages donors left with their gift.
 * The requester and donors are labelled so readers know who's speaking.
 */
export default function Comments({ debtId, comments, payments, open }: { debtId: number; comments: CommentItem[]; payments: Payment[]; open: boolean }) {
    const { t } = useT();
    const ago = useAgo();
    const { auth } = usePage<SharedData>().props;
    const form = useForm({ body: '' });

    const entries: Entry[] = [
        ...comments.map((c) => ({ kind: 'comment' as const, at: c.at, c })),
        ...payments.filter((p) => p.message).map((p) => ({ kind: 'gift' as const, at: p.created_at, p })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    return (
        <section>
            <h2 className="text-xl font-bold">
                {t('cm.title')} <span className="text-mute font-normal">({entries.length})</span>
            </h2>

            {open &&
                (auth.user ? (
                    <form
                        className="border-line mt-4 rounded-xl border bg-white p-3 focus-within:ring-brand/15 focus-within:border-brand focus-within:ring-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(route('comments.store', debtId), { preserveScroll: true, onSuccess: () => form.reset() });
                        }}
                    >
                        <textarea
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder={t('cm.placeholder')}
                            maxLength={500}
                            rows={2}
                            className="placeholder:text-mute/70 w-full resize-none bg-transparent px-1 text-[15px] outline-none"
                        />
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-mute text-xs">{form.errors.body ? <span className="text-rose-600">{form.errors.body}</span> : t('cm.rules')}</span>
                            <button disabled={form.processing || form.data.body.trim().length < 2} className="btn-brand shrink-0 !rounded-lg !px-4 !py-1.5 text-sm">
                                {t('cm.send')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <p className="bg-panel-2 text-mute mt-4 rounded-xl px-4 py-3 text-sm">
                        <Link href={route('login')} className="text-brand font-semibold">
                            {t('nav.login')}
                        </Link>{' '}
                        {t('cm.loginToComment')}
                    </p>
                ))}

            {entries.length === 0 ? (
                <p className="text-mute mt-5 text-sm">{t('cm.empty')}</p>
            ) : (
                <ul className="mt-6 space-y-5">
                    {entries.map((e) =>
                        e.kind === 'comment' ? (
                            <li key={`c${e.c.id}`} className="flex gap-3">
                                {e.c.user ? (
                                    <Link href={route('users.show', e.c.user.id)} className="shrink-0">
                                        <UserAvatar user={e.c.user} size={36} />
                                    </Link>
                                ) : (
                                    <span className="bg-panel-2 size-9 shrink-0 rounded-full" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                        {e.c.user && (
                                            <Link href={route('users.show', e.c.user.id)} className="hover:text-brand font-semibold">
                                                <NameWithBadge user={e.c.user} />
                                            </Link>
                                        )}
                                        {e.c.role === 'owner' && <Role className="bg-brand-soft text-brand">{t('cm.owner')}</Role>}
                                        {e.c.role === 'donor' && <Role className="bg-emerald-50 text-emerald-700">{t('cm.donor')}</Role>}
                                        <span className="text-mute text-xs">{ago(e.c.at)}</span>
                                        {e.c.canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => confirm(t('cm.confirmDelete')) && router.delete(route('comments.destroy', e.c.id), { preserveScroll: true })}
                                                className="text-mute ml-auto hover:text-rose-600"
                                                aria-label={t('cm.delete')}
                                                title={t('cm.delete')}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-1 leading-relaxed break-words whitespace-pre-line">{e.c.body}</p>
                                </div>
                            </li>
                        ) : (
                            <li key={`p${e.p.id}`} className="flex gap-3">
                                <span className="bg-brand-soft text-brand grid size-9 shrink-0 place-items-center rounded-full">
                                    <Heart className="size-4" aria-hidden />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                        {e.p.anonymous || !e.p.donor_id ? (
                                            <b className="font-semibold">{t('anonymous')}</b>
                                        ) : (
                                            <Link href={route('users.show', e.p.donor_id)} className="hover:text-brand font-semibold">
                                                {e.p.payer_name}
                                            </Link>
                                        )}
                                        <Role className="bg-emerald-50 text-emerald-700">{t('cm.gave', { amount: mnt(e.p.amount) })}</Role>
                                        <span className="text-mute text-xs">{ago(e.p.created_at)}</span>
                                    </div>
                                    <p className="mt-1 leading-relaxed break-words">{e.p.message}</p>
                                </div>
                            </li>
                        ),
                    )}
                </ul>
            )}
        </section>
    );
}

function Role({ className, children }: { className: string; children: string }) {
    return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}
