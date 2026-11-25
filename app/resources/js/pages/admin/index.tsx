import { UserAvatar } from '@/components/zeel/people';
import PublicLayout from '@/layouts/public-layout';
import { fmtDate, useT, type TKey } from '@/lib/i18n';
import { mnt, type Debt } from '@/lib/zeel';
import { Link, useForm } from '@inertiajs/react';
import { AlertTriangle, Check, Copy, FileText, Globe, Landmark, Phone, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

type Owner = { id: number; name: string; email: string | null; phone: string | null };
/** Where collected donations are sent: the requester's own account (admin-only). */
type Payout = { bank: string | null; account: string; holder: string | null };
/** Warning sign from the server: [code, details]. */
type Risk = [string, Record<string, unknown>];
type PendingDebt = Debt & { owner: Owner | null; has_bill: boolean; payout: Payout | null; risks: Risk[] };
type PayoutDebt = PendingDebt;
type ReportItem = { id: number; reason: string; details: string | null; by: { id: number; name: string } | null; at: string };
type ReportedDebt = PendingDebt & { reports: ReportItem[] };
type HistoryItem = {
    id: number;
    action: string;
    at: string;
    admin: string | null;
    debt: { id: number; name: string; title: string } | null;
    subject: string | null;
    details: Record<string, string | number> | null;
};
type PendingCompany = {
    id: number;
    name: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    is_company: boolean;
};

const TABS = ['review', 'reports', 'transfers', 'companies', 'history'] as const;
type Tab = (typeof TABS)[number];

export default function Admin({
    pending,
    toDisburse,
    reported,
    pendingCompanies,
    history,
}: {
    pending: PendingDebt[];
    toDisburse: PayoutDebt[];
    reported: ReportedDebt[];
    pendingCompanies: PendingCompany[];
    history: HistoryItem[];
}) {
    const { t } = useT();
    const counts: Record<Tab, number> = {
        review: pending.length,
        reports: reported.length,
        transfers: toDisburse.length,
        companies: pendingCompanies.length,
        history: 0,
    };
    // Open on the first queue that has work waiting.
    const [tab, setTab] = useState<Tab>(TABS.find((k) => counts[k] > 0) ?? 'review');

    return (
        <PublicLayout title={t('nav.admin')}>
            <div className="py-10">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">{t('ad.title')}</h1>
                    <p className="text-mute mt-2 text-[15px]">{t('ad.sub')}</p>
                </header>

                <nav className="border-line mt-8 flex gap-1 overflow-x-auto border-b">
                    {TABS.map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setTab(k)}
                            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${tab === k ? 'border-ink text-ink' : 'text-mute hover:text-ink border-transparent'}`}
                        >
                            {t(`ad.tab.${k}`)}
                            {k !== 'history' && (
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${counts[k] > 0 ? (k === 'reports' ? 'bg-amber-500 text-white' : 'bg-brand text-white') : 'bg-panel-2 text-mute'}`}
                                >
                                    {counts[k]}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mt-6">
                    {tab === 'review' && (
                        <Queue empty={t('ad.noPending')} items={pending}>
                            {(d) => <ReviewCard key={d.id} debt={d} />}
                        </Queue>
                    )}
                    {tab === 'reports' && (
                        <Queue empty={t('ad.noReports')} items={reported}>
                            {(d) => <ReportCard key={d.id} debt={d} />}
                        </Queue>
                    )}
                    {tab === 'transfers' && (
                        <Queue empty={t('ad.noDisburse')} items={toDisburse}>
                            {(d) => <TransferRow key={d.id} debt={d} />}
                        </Queue>
                    )}
                    {tab === 'companies' && (
                        <Queue empty={t('ad.noCompanies')} items={pendingCompanies}>
                            {(c) => <CompanyRow key={c.id} company={c} />}
                        </Queue>
                    )}
                    {tab === 'history' && <History items={history} />}
                </div>
            </div>
        </PublicLayout>
    );
}

function Queue<T>({ items, empty, children }: { items: T[]; empty: string; children: (item: T) => ReactNode }) {
    if (items.length === 0) {
        return <p className="text-mute border-line rounded-xl border border-dashed p-12 text-center">{empty}</p>;
    }
    return <div className="space-y-4">{items.map(children)}</div>;
}

function Contact({ email, phone }: { email: string | null; phone: string | null }) {
    if (!phone && !email) return null;
    return (
        <span className="inline-flex items-center gap-1">
            {phone && <Phone className="size-3.5" aria-hidden />}
            {phone ?? email}
        </span>
    );
}

function ReviewCard({ debt }: { debt: PendingDebt }) {
    const { t } = useT();
    const { data, setData, post, transform, processing, errors } = useForm({ note: '' });

    function decide(decision: 'verified' | 'rejected') {
        return (e: FormEvent) => {
            e.preventDefault();
            transform((d) => ({ ...d, decision }));
            post(route('admin.review', debt.id), { preserveScroll: true });
        };
    }

    return (
        <article className="border-line rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                    <Link href={route('debts.show', debt.id)} className="hover:text-brand text-lg font-semibold">
                        {debt.title}
                    </Link>
                    <div className="text-mute mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <span>{t(`cat.${debt.category}`)}</span>
                        <span>{fmtDate(debt.created_at)}</span>
                    </div>
                </div>
                <span className="text-xl font-semibold tabular-nums">{mnt(debt.amount)}</span>
            </div>

            <p className="text-ink/80 mt-3 line-clamp-3 text-sm leading-relaxed">{debt.story}</p>

            <div className="bg-panel-2 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm">
                <span className="text-mute flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                        {t('ad.owner')}: <b className="text-ink font-medium">{debt.owner?.name ?? '—'}</b>
                    </span>
                    {debt.owner && <Contact email={debt.owner.email} phone={debt.owner.phone} />}
                </span>
                {debt.has_bill && (
                    <a href={route('admin.bill', debt.id)} target="_blank" className="text-brand inline-flex items-center gap-1.5 font-medium hover:underline">
                        <FileText className="size-4" aria-hidden /> {t('ad.bill')}
                    </a>
                )}
            </div>

            <Risks risks={debt.risks} />
            <PayoutAccount payout={debt.payout} />

            <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={decide('verified')}>
                <input
                    className="z-input flex-1"
                    placeholder={t('ad.notePh')}
                    value={data.note}
                    onChange={(e) => setData('note', e.target.value)}
                    maxLength={300}
                    required
                />
                <div className="flex gap-2">
                    <button disabled={processing} className="btn-brand !rounded-xl !px-5 !py-2.5 text-sm">
                        <Check className="size-4" aria-hidden /> {t('ad.approve')}
                    </button>
                    <button
                        type="button"
                        disabled={processing}
                        onClick={(e) => decide('rejected')(e)}
                        className="btn-ghost !rounded-xl !px-5 !py-2.5 text-sm !text-rose-600 hover:!border-rose-200"
                    >
                        <X className="size-4" aria-hidden /> {t('ad.reject')}
                    </button>
                </div>
            </form>
            {errors.note && <p className="mt-1 text-sm text-rose-600">{errors.note}</p>}
        </article>
    );
}

function TransferRow({ debt }: { debt: PayoutDebt }) {
    const { t } = useT();
    const available = debt.paid - debt.disbursed;
    const { data, setData, post, processing, errors, reset } = useForm<{ amount: number; reference: string; receipt: File | null }>({
        amount: available,
        reference: '',
        receipt: null,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('admin.disburse', debt.id), { preserveScroll: true, forceFormData: true, onSuccess: () => reset() });
    }

    return (
        <form onSubmit={submit} className="border-line rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <Link href={route('debts.show', debt.id)} className="hover:text-brand font-semibold">
                        {debt.name} — {debt.title}
                    </Link>
                    {debt.owner?.phone && (
                        <div className="text-mute mt-0.5 text-sm">
                            <Contact email={null} phone={debt.owner.phone} />
                        </div>
                    )}
                </div>
                <dl className="flex gap-5 text-right text-sm">
                    <Money label={t('show.collected')} value={debt.paid} />
                    <Money label={t('show.sent')} value={debt.disbursed} />
                    <Money label={t('ad.availableLabel')} value={available} strong />
                </dl>
            </div>

            <Risks risks={debt.risks} />
            <PayoutAccount payout={debt.payout} />

            <div className="mt-4 grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]">
                <label className="relative">
                    <span className="text-mute absolute top-1/2 left-3.5 -translate-y-1/2 text-sm">₮</span>
                    <input
                        className="z-input pl-7 tabular-nums"
                        inputMode="numeric"
                        aria-label={t('ad.amount')}
                        value={data.amount.toLocaleString('en-US')}
                        onChange={(e) => setData('amount', Number(e.target.value.replace(/\D/g, '') || 0))}
                    />
                </label>
                <input className="z-input" placeholder={t('ad.ref')} value={data.reference} onChange={(e) => setData('reference', e.target.value)} required />
                <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    title={t('ad.receipt')}
                    onChange={(e) => setData('receipt', e.target.files?.[0] ?? null)}
                    required
                    className="border-line text-mute file:bg-panel-2 w-full rounded-xl border bg-white px-2 py-1.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                <button disabled={processing} className="btn-brand !rounded-xl !px-5 !py-2.5 text-sm whitespace-nowrap">
                    {t('ad.record')}
                </button>
            </div>
            {(errors.amount || errors.reference || errors.receipt) && (
                <p className="mt-2 text-sm text-rose-600">{errors.amount || errors.reference || errors.receipt}</p>
            )}
        </form>
    );
}

function Money({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
    return (
        <div>
            <dt className="text-mute text-xs">{label}</dt>
            <dd className={`tabular-nums ${strong ? 'text-ink font-semibold' : ''}`}>{mnt(value)}</dd>
        </div>
    );
}

function CompanyRow({ company }: { company: PendingCompany }) {
    const { t } = useT();
    const { post, processing } = useForm({});
    const site = company.website?.replace(/^https?:\/\//, '');

    return (
        <div className="border-line flex flex-wrap items-center gap-4 rounded-xl border bg-white p-5">
            <UserAvatar user={{ ...company, is_company: true }} size={44} />
            <div className="min-w-0 flex-1">
                <Link href={route('users.show', company.id)} className="hover:text-brand font-semibold">
                    {company.name}
                </Link>
                <div className="text-mute mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {site && (
                        <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand inline-flex items-center gap-1">
                            <Globe className="size-3.5" aria-hidden /> {site}
                        </a>
                    )}
                    <Contact email={company.email} phone={company.phone} />
                </div>
            </div>
            <button
                type="button"
                disabled={processing}
                onClick={() => post(route('admin.companies.verify', company.id), { preserveScroll: true })}
                className="btn-brand !rounded-xl !px-5 !py-2.5 text-sm"
            >
                <Check className="size-4" aria-hidden /> {t('ad.verifyCompany')}
            </button>
        </div>
    );
}

/** The requester's bank account, with a one-click copy of the account number. */
function PayoutAccount({ payout }: { payout: Payout | null }) {
    const { t } = useT();
    const [copied, setCopied] = useState(false);

    if (!payout) {
        return <p className="mt-4 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">{t('ad.noPayout')}</p>;
    }

    function copy() {
        navigator.clipboard?.writeText(payout!.account).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <div className="border-line mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3.5 py-2.5 text-sm">
            <span className="text-mute inline-flex items-center gap-1.5">
                <Landmark className="size-4" aria-hidden /> {t('ad.payTo')}
            </span>
            <span className="font-medium">{payout.holder}</span>
            <span className="text-mute">{payout.bank}</span>
            <button type="button" onClick={copy} className="hover:text-brand inline-flex items-center gap-1.5 font-mono tracking-wide" title={t('ad.copy')}>
                {payout.account}
                {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Copy className="text-mute size-3.5" aria-hidden />}
            </button>
        </div>
    );
}

/** Warning signs, worst first, in plain words. */
function Risks({ risks }: { risks: Risk[] }) {
    const { t } = useT();
    if (risks.length === 0) return null;

    return (
        <ul className="mt-4 space-y-1.5">
            {risks.map(([code, d]) => (
                <li key={code} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                    <span>
                        {t(`risk.${code}` as TKey, { n: Number(d.n ?? 0), days: Number(d.days ?? 0), holder: String(d.holder ?? '') })}
                        {code === 'shared_account' &&
                            (d.requests as { id: number; name: string; title: string }[]).map((r) => (
                                <Link key={r.id} href={route('debts.show', r.id)} className="ml-1.5 font-medium underline">
                                    #{r.id} {r.name}
                                </Link>
                            ))}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** A reported or paused request: what people said, and the admin's decision. */
function ReportCard({ debt }: { debt: ReportedDebt }) {
    const { t } = useT();
    const form = useForm({ note: '', decision: 'rejected' as const });

    return (
        <article className={`rounded-xl border bg-white p-5 ${debt.paused ? 'border-amber-300' : 'border-line'}`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                    <Link href={route('debts.show', debt.id)} className="hover:text-brand text-lg font-semibold">
                        {debt.name} — {debt.title}
                    </Link>
                    <div className="text-mute mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {debt.paused ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{t('ad.paused')}</span>
                        ) : (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{t('ad.stillLive')}</span>
                        )}
                        <span>
                            {mnt(debt.paid)} / {mnt(debt.amount)}
                        </span>
                        {debt.owner && <Contact email={debt.owner.email} phone={debt.owner.phone} />}
                    </div>
                </div>
            </div>

            <ul className="border-line divide-line mt-4 divide-y rounded-lg border">
                {debt.reports.map((r) => (
                    <li key={r.id} className="px-3.5 py-2.5 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">{t(`rep.r.${r.reason}` as TKey)}</span>
                            <span className="text-mute text-xs">
                                {r.by?.name} · {fmtDate(r.at)}
                            </span>
                        </div>
                        {r.details && <p className="text-mute mt-1">{r.details}</p>}
                    </li>
                ))}
                {debt.reports.length === 0 && <li className="text-mute px-3.5 py-2.5 text-sm">{t('ad.noOpenReports')}</li>}
            </ul>

            <Risks risks={debt.risks.filter(([code]) => code !== 'reports')} />
            <PayoutAccount payout={debt.payout} />

            <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
                <input
                    className="z-input flex-1"
                    placeholder={t('ad.decisionPh')}
                    value={form.data.note}
                    onChange={(e) => form.setData('note', e.target.value)}
                    maxLength={300}
                    required
                />
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={form.processing || !form.data.note}
                        onClick={() => form.post(route('admin.reports.dismiss', debt.id), { preserveScroll: true })}
                        className="btn-ghost !rounded-xl !px-5 !py-2.5 text-sm"
                    >
                        <Check className="size-4" aria-hidden /> {t('ad.keepLive')}
                    </button>
                    <button
                        type="button"
                        disabled={form.processing || !form.data.note}
                        onClick={() => form.post(route('admin.review', debt.id), { preserveScroll: true })}
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
                    >
                        <X className="size-4" aria-hidden /> {t('ad.rejectRequest')}
                    </button>
                </div>
            </form>
            {form.errors.note && <p className="mt-1 text-sm text-rose-600">{form.errors.note}</p>}
        </article>
    );
}

/** Audit log: every decision, who made it and when. */
function History({ items }: { items: HistoryItem[] }) {
    const { t } = useT();
    if (items.length === 0) {
        return <p className="text-mute border-line rounded-xl border border-dashed p-12 text-center">{t('ad.noHistory')}</p>;
    }
    return (
        <ol className="border-line divide-line divide-y rounded-xl border bg-white">
            {items.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-sm">
                    <span className="text-mute w-24 shrink-0 text-xs tabular-nums">{fmtDate(a.at)}</span>
                    <span className="font-medium">{t(`hist.${a.action}` as TKey)}</span>
                    {a.debt && (
                        <Link href={route('debts.show', a.debt.id)} className="text-brand hover:underline">
                            {a.debt.name} — {a.debt.title}
                        </Link>
                    )}
                    {a.subject && <span>{a.subject}</span>}
                    {a.details?.amount !== undefined && <span className="tabular-nums">{mnt(Number(a.details.amount))}</span>}
                    {a.details?.note && <span className="text-mute">“{a.details.note}”</span>}
                    <span className="text-mute ml-auto text-xs">{a.admin ?? t('hist.system')}</span>
                </li>
            ))}
        </ol>
    );
}
