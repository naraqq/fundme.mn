import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { fmtDate, useT } from '@/lib/i18n';
import { catOf, mnt, type Debt } from '@/lib/zeel';
import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

type PendingDebt = Debt & { owner: { name: string; email: string } | null; has_bill: boolean };
type PendingCompany = { id: number; name: string; website: string | null; email: string | null; phone: string | null };

export default function Admin({
    pending,
    toDisburse,
    pendingCompanies,
}: {
    pending: PendingDebt[];
    toDisburse: Debt[];
    pendingCompanies: PendingCompany[];
}) {
    const { t } = useT();

    return (
        <AppLayout breadcrumbs={[{ title: t('nav.admin'), href: route('admin.index') }]}>
            <Head title={t('nav.admin')} />
            <div className="grid gap-3 p-3 xl:grid-cols-2">
                <section className="rounded-lg border p-3">
                    <h2 className="mb-2 text-sm font-semibold">{t('ad.pending', { n: pending.length })}</h2>
                    {pending.length === 0 && <p className="text-muted-foreground text-sm">{t('ad.noPending')}</p>}
                    <div className="space-y-2">
                        {pending.map((d) => (
                            <ReviewRow key={d.id} debt={d} />
                        ))}
                    </div>
                </section>

                <section className="rounded-lg border p-3">
                    <h2 className="mb-2 text-sm font-semibold">{t('ad.companies', { n: pendingCompanies.length })}</h2>
                    {pendingCompanies.length === 0 && <p className="text-muted-foreground text-sm">{t('ad.noCompanies')}</p>}
                    <div className="space-y-2">
                        {pendingCompanies.map((c) => (
                            <CompanyRow key={c.id} company={c} />
                        ))}
                    </div>
                </section>

                <section className="rounded-lg border p-3">
                    <h2 className="mb-2 text-sm font-semibold">{t('ad.disburse', { n: toDisburse.length })}</h2>
                    {toDisburse.length === 0 && <p className="text-muted-foreground text-sm">{t('ad.noDisburse')}</p>}
                    <div className="space-y-2">
                        {toDisburse.map((d) => (
                            <DisburseRow key={d.id} debt={d} />
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

function CompanyRow({ company }: { company: PendingCompany }) {
    const { t } = useT();
    const { post, processing } = useForm({});
    return (
        <div className="bg-muted/40 flex items-center gap-3 rounded-md p-2.5 text-sm">
            <div className="min-w-0 flex-1">
                <Link href={route('users.show', company.id)} className="font-medium hover:underline">
                    🏢 {company.name}
                </Link>
                <div className="text-muted-foreground truncate text-xs">
                    {company.website && <>{company.website} · </>}
                    {company.email ?? company.phone}
                </div>
            </div>
            <Button size="sm" className="h-8" disabled={processing} onClick={() => post(route('admin.companies.verify', company.id), { preserveScroll: true })}>
                ✓ {t('ad.verifyCompany')}
            </Button>
        </div>
    );
}

function ReviewRow({ debt }: { debt: PendingDebt }) {
    const { t } = useT();
    const { data, setData, post, transform, processing, errors } = useForm({ note: '' });

    function submit(decision: 'verified' | 'rejected') {
        return (e: FormEvent) => {
            e.preventDefault();
            transform((d) => ({ ...d, decision }));
            post(route('admin.review', debt.id), { preserveScroll: true });
        };
    }

    return (
        <div className="bg-muted/40 rounded-md p-2.5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={route('debts.show', debt.id)} className="font-medium hover:underline">
                    {debt.name} — {debt.title}
                </Link>
                <span className="font-semibold">{mnt(debt.amount)}</span>
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">
                {catOf(debt.category).emoji} {debt.creditor} · {t('ad.owner')}: {debt.owner?.name} ({debt.owner?.email}) · {fmtDate(debt.created_at)}
                {debt.has_bill && (
                    <>
                        {' · '}
                        <a href={route('admin.bill', debt.id)} target="_blank" className="text-foreground underline">
                            📎 {t('ad.bill')}
                        </a>
                    </>
                )}
            </div>
            <form className="mt-2 flex gap-1.5" onSubmit={submit('verified')}>
                <Input
                    className="h-8 text-sm"
                    placeholder={t('ad.notePh')}
                    value={data.note}
                    onChange={(e) => setData('note', e.target.value)}
                    maxLength={300}
                    required
                />
                <Button size="sm" className="h-8" disabled={processing}>
                    {t('ad.approve')}
                </Button>
                <Button type="button" size="sm" variant="destructive" className="h-8" disabled={processing} onClick={(e) => submit('rejected')(e)}>
                    {t('ad.reject')}
                </Button>
            </form>
            {errors.note && <p className="mt-1 text-xs text-red-500">{errors.note}</p>}
        </div>
    );
}

function DisburseRow({ debt }: { debt: Debt }) {
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
        <form onSubmit={submit} className="bg-muted/40 rounded-md p-2.5 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={route('debts.show', debt.id)} className="font-medium hover:underline">
                    {debt.name} → {debt.creditor}
                </Link>
                <span className="text-muted-foreground text-xs">{t('ad.available', { amount: mnt(available) })}</span>
            </div>
            <div className="mt-2 grid grid-cols-[110px_1fr_1fr_auto] gap-1.5">
                <Input
                    className="h-8 text-sm"
                    inputMode="numeric"
                    value={data.amount.toLocaleString('en-US')}
                    onChange={(e) => setData('amount', Number(e.target.value.replace(/\D/g, '') || 0))}
                />
                <Input
                    className="h-8 text-sm"
                    placeholder={t('ad.ref')}
                    value={data.reference}
                    onChange={(e) => setData('reference', e.target.value)}
                    required
                />
                <Input
                    className="h-8 text-xs"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    title={t('ad.receipt')}
                    onChange={(e) => setData('receipt', e.target.files?.[0] ?? null)}
                    required
                />
                <Button size="sm" className="h-8" disabled={processing}>
                    {t('ad.record')}
                </Button>
            </div>
            {(errors.amount || errors.reference || errors.receipt) && (
                <p className="mt-1 text-xs text-red-500">{errors.amount || errors.reference || errors.receipt}</p>
            )}
        </form>
    );
}
