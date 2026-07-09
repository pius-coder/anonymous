import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminShell } from "./admin-shell";
import type { SidebarItem } from "./admin-shell";

type MeResponse = { success: boolean; data?: { user: { id: string; role: string; email: string; name: string | null } } };

export type UserRole = "ADMIN" | "SUPER_ADMIN" | "FINANCE" | "SUPPORT";

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"] },
  { label: "Sessions", href: "/admin/sessions", icon: "Gamepad2", roles: ["ADMIN", "SUPER_ADMIN"], viewRoles: ["FINANCE", "SUPPORT"] },
  { label: "Live control", href: "/admin/live", icon: "Radio", roles: ["ADMIN", "SUPER_ADMIN"], viewRoles: ["SUPPORT"] },
  { label: "Paiements", href: "/admin/payments", icon: "CreditCard", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE"], viewRoles: ["SUPPORT"] },
  { label: "Wallets", href: "/admin/wallets", icon: "Wallet", roles: ["SUPER_ADMIN", "FINANCE"], viewRoles: ["SUPPORT"] },
  { label: "Utilisateurs", href: "/admin/users", icon: "Users", roles: ["ADMIN", "SUPER_ADMIN", "SUPPORT"], viewRoles: ["FINANCE"] },
  { label: "Mini-jeux", href: "/admin/minigames", icon: "Blocks", roles: ["ADMIN", "SUPER_ADMIN"] },
  { label: "Audit logs", href: "/admin/audit", icon: "ScrollText", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"] },
];

export function filterSidebarItems(role: string, items: SidebarItem[]): SidebarItem[] {
  return items.filter((item) => {
    if (item.roles.some((r) => r === role)) return true;
    if (item.viewRoles?.some((r) => r === role)) return true;
    return false;
  });
}

async function getSession() {
  const apiBase = process.env.API_URL || "http://localhost:3001";
  const cookieHeader = (await cookies()).toString();
  try {
    const res = await fetch(`${apiBase}/v1/me`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    const json: MeResponse = await res.json();
    return json.data?.user ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"].includes(user.role)) {
    notFound();
  }

  const filteredItems = filterSidebarItems(user.role, SIDEBAR_ITEMS);

  return (
    <AdminShell user={{ id: user.id, name: user.name, email: user.email, role: user.role }} items={filteredItems}>
      {children}
    </AdminShell>
  );
}
