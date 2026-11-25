import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote?: { message: string; author: string };
    flash: { success?: string | null; toast?: FlashToast | null };
    locale: "mn" | "en";
    auth: Auth;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string | null;
    phone?: string | null;
    city?: string | null;
    bio?: string | null;
    is_company?: boolean;
    company_verified?: boolean;
    website?: string | null;
    logo_url?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    is_admin?: boolean;
    [key: string]: unknown; // This allows for additional properties...
}

/** One-time notification flashed by Controller::toast() on the server. */
export interface FlashToast {
    id: string;
    type: 'success' | 'info' | 'error';
    key: string;
    vars: Record<string, string | number>;
    description: string | null;
}
