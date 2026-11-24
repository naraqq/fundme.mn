export type Category = 'loan' | 'medical' | 'tuition' | 'rent' | 'utility' | 'phone' | 'food' | 'transport' | 'other';

export const CATEGORIES: { value: Category; emoji: string }[] = [
    { value: 'loan', emoji: '🏦' },
    { value: 'medical', emoji: '🏥' },
    { value: 'tuition', emoji: '🎓' },
    { value: 'rent', emoji: '🏠' },
    { value: 'utility', emoji: '💡' },
    { value: 'phone', emoji: '📱' },
    { value: 'food', emoji: '🍱' },
    { value: 'transport', emoji: '🚌' },
    { value: 'other', emoji: '🧾' },
];

export type Payment = {
    id: number;
    payer_name: string;
    donor_id: number | null;
    anonymous: boolean;
    amount: number;
    message: string | null;
    created_at: string;
    debt?: { id: number; name: string; title: string };
};

export type Debt = {
    id: number;
    name: string;
    age: number | null;
    city: string;
    title: string;
    story: string;
    category: Category;
    creditor: string;
    amount: number;
    verified: boolean;
    status: 'pending' | 'verified' | 'rejected';
    phase: Phase;
    verified_at: string | null;
    verification_note: string | null;
    color: string;
    created_at: string;
    paid: number;
    remaining: number;
    disbursed: number;
    photo_url: string | null;
    photo_credit: string | null;
    photo_credit_url: string | null;
    payments_count?: number;
    payments?: Payment[];
    disbursements?: Disbursement[];
};

/** pending → open → funded (all collected) → settled (all sent to creditor); or rejected */
export type Phase = 'pending' | 'open' | 'funded' | 'settled' | 'rejected';

/** Money actually sent to the creditor, with a public verification code. */
export type Disbursement = {
    id: number;
    code: string;
    amount: number;
    reference: string;
    paid_at: string;
    has_receipt: boolean;
};

export const catOf = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

/** Mirrors Debt::SMALL_MAX on the server. */
export const SMALL_MAX = 100_000;

export const mnt = (n: number) => '₮' + Math.round(n).toLocaleString('en-US');
