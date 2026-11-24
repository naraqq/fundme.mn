import LangSwitch from '@/components/zeel/lang-switch';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useT } from '@/lib/i18n';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, Globe, LayoutGrid, Scale, SearchCheck, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { t } = useT();
    const { auth } = usePage<SharedData>().props;

    const mainNavItems: NavItem[] = [
        { title: t('dash.title'), url: '/dashboard', icon: LayoutGrid },
        { title: t('nav.home'), url: '/', icon: Globe },
        ...(auth.user?.is_admin ? [{ title: t('nav.admin'), url: '/admin', icon: ShieldCheck }] : []),
    ];

    const mainNavItemsAll: NavItem[] = [
        ...mainNavItems,
        ...(auth.user ? [{ title: t('pf.myProfile'), url: `/u/${auth.user.id}`, icon: UserRound }] : []),
        { title: t('nav.donors'), url: '/donors', icon: Trophy },
        { title: t('nav.companies'), url: '/companies', icon: Building2 },
    ];

    const footerNavItems: NavItem[] = [
        { title: t('nav.transparency'), url: '/transparency', icon: Scale },
        { title: t('nav.verify'), url: '/verify', icon: SearchCheck },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItemsAll} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <LangSwitch className="mx-2 w-fit group-data-[collapsible=icon]:hidden" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
