"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gamepad2, Home, Bell, User, LogOut, PanelLeftOpen, Sparkles } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/retroui/sidebar";
import { Avatar, AvatarFallback } from "@/components/retroui/avatar";
import { Badge } from "@/components/retroui/badge";
import { apiPost } from "@/lib/api";
import { useSession } from "@/lib/useSession";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Catalogue", href: "/catalogue", icon: Gamepad2 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Mon compte", href: "/me", icon: User },
] as const;

function ArenaSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const sidebarInner = (
    <>
      <SidebarHeader className="border-b border-white/10 px-3 py-4">
        <Link href="/" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/45 bg-primary/18 shadow-[0_0_28px_rgba(237,27,118,.2)]">
            <Sparkles className="size-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate font-head text-base font-black uppercase tracking-tight">Session Jeu</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-white/38">Plateforme compétitive</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="font-head text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {collapsed ? "" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={active}
                      tooltip={label}
                      className={cn(
                        "h-11 rounded-xl border border-transparent px-3 font-head text-xs font-bold uppercase tracking-wide transition",
                        active
                          ? "border-primary/35 bg-primary/18 text-white shadow-[0_8px_22px_rgba(237,27,118,.12)]"
                          : "text-white/58 hover:border-white/10 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3">
        {loading ? (
          <div className={cn("flex items-center gap-3 p-2.5", collapsed && "justify-center px-1")}>
            <div className="size-9 animate-pulse rounded-full bg-muted" />
          </div>
        ) : user ? (
          <div className={cn("flex items-center gap-3 p-2.5", collapsed && "justify-center px-1")}>
            <Avatar className="size-9 border border-white/14">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-[#3153a4] font-head text-xs">
                {(user.name ?? user.email).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user.name ?? user.email}</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{user.role ?? "joueur"}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={cn("p-2.5", collapsed && "flex justify-center")}>
            <Link href="/auth/login" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground underline underline-offset-2">
              Connexion
            </Link>
          </div>
        )}
        {user && (
          <form
            action={async () => {
              await apiPost("/auth/logout");
              router.push("/");
            }}
            className={cn("mt-2", collapsed && "flex justify-center")}
          >
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <LogOut className="size-3.5" />
              {!collapsed && "Déconnexion"}
            </button>
          </form>
        )}
      </SidebarFooter>
    </>
  );

  return (
    <Sidebar collapsible="icon" variant="floating" className="p-3">
      {isMobile ? (
        <div className="flex size-full flex-col p-3">
          <div className="flex size-full flex-col rounded-lg shadow-sm ring-1 ring-sidebar-border bg-sidebar">
            {sidebarInner}
          </div>
        </div>
      ) : (
        sidebarInner
      )}
    </Sidebar>
  );
}

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className="min-h-screen bg-background game-surface">
      <ArenaSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-transparent">
        <header className="sticky top-0 z-30 px-3 pt-3 md:px-5 md:pt-4">
          <div className="premium-toolbar flex h-14 items-center justify-between gap-3 px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="shrink-0 border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                <PanelLeftOpen className="size-4" />
              </SidebarTrigger>
              <div className="min-w-0">
                <p className="truncate font-head text-xs font-black uppercase tracking-widest">Arena Joueur</p>
                <p className="truncate text-[10px] text-white/38">Sessions, compétitions et profil</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <span className="status-dot mr-1 text-[--arena-green]" /> Connecté
              </Badge>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 pb-10 pt-5 md:px-6 md:pt-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
