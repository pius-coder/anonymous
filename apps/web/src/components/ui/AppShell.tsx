"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Binoculars,
  CircleHelp,
  Gamepad2,
  House,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/useSession";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Audience = "Joueur" | "Admin" | "Super admin" | "Support" | "Finance" | "Observateur";

type AppShellProps = {
  audience: Audience;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const commonNavigation: NavItem[] = [
  { label: "Accueil", href: "/", icon: House },
  { label: "Parties", href: "/parties", icon: Gamepad2 },
];

const playerNavigation: NavItem[] = [
  ...commonNavigation,
  { label: "Mes tickets", href: "/me/tickets", icon: TicketCheck },
  { label: "Portefeuille", href: "/me/wallet", icon: WalletCards },
  { label: "Notifications", href: "/me/notifications", icon: Bell },
];

const adminNavigation: NavItem[] = [
  { label: "Pilotage", href: "/admin", icon: ShieldCheck },
  { label: "Sessions", href: "/admin/parties", icon: Gamepad2 },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Paiements", href: "/admin/payments", icon: WalletCards },
  { label: "Mini-jeux", href: "/admin/minigames", icon: Sparkles },
];

const supportNavigation: NavItem[] = [
  { label: "File support", href: "/support", icon: CircleHelp },
  { label: "Dossiers parties", href: "/support/parties/demo-party", icon: Gamepad2 },
];

const financeNavigation: NavItem[] = [
  { label: "Vue finance", href: "/finance", icon: House },
  { label: "Paiements", href: "/admin/payments", icon: WalletCards },
  { label: "Portefeuilles", href: "/admin/wallets", icon: TicketCheck },
];

const superAdminNavigation: NavItem[] = [
  { label: "Gouvernance", href: "/super-admin", icon: ShieldCheck },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Audit", href: "/admin/audit", icon: Search },
  { label: "Conformité", href: "/admin/compliance", icon: TicketCheck },
];

function observerHomeFromPath(pathname: string) {
  const match = pathname.match(/^\/observe\/parties\/([^/]+)/);
  return match ? `/observe/parties/${match[1]}` : "/parties";
}

function observerNavigationForPath(pathname: string): NavItem[] {
  const base = observerHomeFromPath(pathname);
  return [
    { label: "Vue d’ensemble", href: base, icon: House },
    { label: "Résultats publics", href: `${base}/results`, icon: Binoculars },
  ];
}

function navigationFor(audience: Audience, pathname: string): NavItem[] {
  if (audience === "Super admin") return superAdminNavigation;
  if (audience === "Support") return supportNavigation;
  if (audience === "Finance") return financeNavigation;
  if (audience === "Admin") return adminNavigation;
  if (audience === "Observateur") return observerNavigationForPath(pathname);
  return playerNavigation;
}

function homeFor(audience: Audience, pathname: string) {
  if (audience === "Super admin") return "/super-admin";
  if (audience === "Support") return "/support";
  if (audience === "Finance") return "/finance";
  if (audience === "Admin") return "/admin";
  if (audience === "Observateur") return observerHomeFromPath(pathname);
  return "/parties";
}

export function AppShell({ audience, eyebrow, title, subtitle, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const navigation = navigationFor(audience, pathname);
  const displayName = user?.name || user?.email || audience;

  async function signOut() {
    await logout();
    router.push("/auth/login");
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="app-shell-frame">
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarHeader className="p-3">
            <Link className="brand-lockup" href={homeFor(audience, pathname)} aria-label="Noya — accueil">
              <span className="brand-mark" aria-hidden="true">
                <Sparkles />
              </span>
              <span className="brand-copy">
                <strong>NOYA</strong>
                <small>PLAY TOGETHER</small>
              </span>
            </Link>
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Espace {audience.toLowerCase()}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const active = item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={active}
                          tooltip={item.label}
                        >
                          <item.icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Aide">
                  <CircleHelp aria-hidden="true" />
                  <span>Aide</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div className="sidebar-identity">
              <PixelAvatar seed={displayName} size="sm" />
              <span>
                <strong>{displayName}</strong>
                <small>{audience}</small>
              </span>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-0 overflow-hidden">
          <header className="app-header">
            <div className="app-header-main">
              <SidebarTrigger className="md:hidden" aria-label="Ouvrir la navigation" />
              <div className="app-heading">
                <p className="app-eyebrow">{eyebrow}</p>
                <h1>{title}</h1>
                {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
              </div>
            </div>

            <div className="app-header-actions">
              {actions}
              <Badge variant="outline" className="audience-pill">
                {audience}
              </Badge>
              <HeaderIcon label="Rechercher">
                <Search />
              </HeaderIcon>
              <HeaderIcon label="Notifications" count={3}>
                <Bell />
              </HeaderIcon>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="profile-trigger"
                      variant="ghost"
                      size="icon-lg"
                      aria-label="Ouvrir le profil"
                    />
                  }
                >
                  <PixelAvatar seed={displayName} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="profile-menu-name">{displayName}</span>
                    <span className="profile-menu-role">{audience}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/account" />}>
                    <Settings />
                    Préférences
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={signOut}>
                    <LogOut />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="app-content" data-scroll-region="page">
            <div className="app-content-inner">{children}</div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function HeaderIcon({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button className="header-icon" variant="ghost" size="icon-lg" aria-label={label} />
        }
      >
        {children}
        {count ? <span className="notification-count">{count}</span> : null}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
