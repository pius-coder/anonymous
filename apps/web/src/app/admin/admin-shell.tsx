"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gamepad2,
  Radio,
  CreditCard,
  Wallet,
  Users,
  Blocks,
  ScrollText,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
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
import { apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  label: string;
  href: string;
  icon: string;
  roles: string[];
  viewRoles?: string[];
};

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Gamepad2,
  Radio,
  CreditCard,
  Wallet,
  Users,
  Blocks,
  ScrollText,
};

type Props = {
  user: { id: string; name: string | null; email: string; role: string };
  items: SidebarItem[];
  children: React.ReactNode;
};

function AdminSidebar({ items, user }: { items: SidebarItem[]; user: Props["user"] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-4 border-border bg-card">
      <SidebarHeader className="border-b-4 border-border px-4 py-4">
        <Link href="/admin" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex size-8 items-center justify-center border-2 border-[--arena-pink] bg-[--arena-pink]/20 font-head text-lg font-black text-[--arena-pink]">
            S
          </div>
          {!collapsed && <span className="font-head text-lg font-black uppercase tracking-tight">Admin</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-head text-xs uppercase text-muted-foreground">
            {collapsed ? "" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.label}
                    >
                      {Icon && <Icon className="size-5 shrink-0" />}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t-4 border-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="size-8 border-2 border-border">
            <AvatarFallback className="bg-secondary font-head text-xs">
              {(user.name ?? user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          )}
        </div>
        <form
          action={async () => {
            await apiPost("/auth/logout");
            router.push("/");
          }}
          className={cn("mt-3", collapsed && "flex justify-center")}
        >
          <button type="submit" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="size-4" />
            {!collapsed && "Déconnexion"}
          </button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminShell({ user, items, children }: Props) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar items={items} user={user} />
        <SidebarInset className="flex-1">
          <header className="flex h-14 items-center gap-3 border-b-4 border-border bg-card px-4">
            <SidebarTrigger className="border-2 border-border p-1.5 hover:bg-accent">
              <PanelLeftOpen className="size-5" />
            </SidebarTrigger>
            <span className="font-head text-sm uppercase tracking-widest text-muted-foreground">
              {user.role.replace("_", " ")}
            </span>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
