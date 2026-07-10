import { AdminShell, type SidebarItem } from "./admin-shell";
import { AdminService } from "@/services/admin/AdminService";
import { requireAuth } from "@/components/layouts/AuthShell";

const STAFF_ROLES: string[] = ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"];
const ADMIN_ROLES: string[] = ["ADMIN", "SUPER_ADMIN"];

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutDashboard", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"] },
  { label: "Sessions", href: "/admin/sessions", icon: "Gamepad2", roles: ADMIN_ROLES, viewRoles: ["FINANCE", "SUPPORT"] },
  { label: "Live control", href: "/admin/live", icon: "Radio", roles: ADMIN_ROLES, viewRoles: ["SUPPORT"] },
  { label: "Paiements", href: "/admin/payments", icon: "CreditCard", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE"], viewRoles: ["SUPPORT"] },
  { label: "Wallets", href: "/admin/wallets", icon: "Wallet", roles: ["SUPER_ADMIN", "FINANCE"], viewRoles: ["SUPPORT"] },
  { label: "Utilisateurs", href: "/admin/users", icon: "Users", roles: ["ADMIN", "SUPER_ADMIN", "SUPPORT"], viewRoles: ["FINANCE"] },
  { label: "Mini-jeux", href: "/admin/minigames", icon: "Blocks", roles: ADMIN_ROLES },
  { label: "Conformité", href: "/admin/compliance", icon: "ShieldCheck", roles: ADMIN_ROLES, viewRoles: ["FINANCE", "SUPPORT"] },
  { label: "Audit logs", href: "/admin/audit", icon: "ScrollText", roles: ["ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"] },
];

function filterSidebarItems(role: string, items: SidebarItem[]): SidebarItem[] {
  return items.filter((item) => {
    if (item.roles.some((r) => r === role)) return true;
    if (item.viewRoles?.some((r) => r === role)) return true;
    return false;
  });
}

async function getSession() {
  try {
    const admin = new AdminService();
    return await admin.getCurrentAdmin();
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth(getSession(), STAFF_ROLES);

  const filteredItems = filterSidebarItems(user.role, SIDEBAR_ITEMS);

  return (
    <AdminShell user={{ id: user.id, name: user.name, email: user.email, role: user.role }} items={filteredItems}>
      {children}
    </AdminShell>
  );
}
