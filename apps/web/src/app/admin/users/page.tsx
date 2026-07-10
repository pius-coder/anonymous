import type { Metadata } from "next";
import { getAdminUsers } from "@/actions/admin";
import { AdminUsersContent } from "@/components/admin/AdminUsersContent";

export const metadata: Metadata = {
  title: "Utilisateurs | Admin",
};

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await props.searchParams;
  const users = await getAdminUsers({ q, role, limit: "50" });
  const rows = users?.data ?? [];
  const total = users?.meta?.total ?? 0;

  return <AdminUsersContent rows={rows} q={q} role={role} total={total} />;
}
