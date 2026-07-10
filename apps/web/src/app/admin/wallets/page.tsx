import type { Metadata } from "next";
import { getAdminDashboard } from "@/actions/admin";
import { AdminWalletsContent } from "@/components/admin/AdminWalletsContent";

export const metadata: Metadata = {
  title: "Wallets | Admin",
};

export default async function AdminWalletsPage() {
  const dashboard = await getAdminDashboard();
  const finance = dashboard?.finance ?? null;

  return <AdminWalletsContent finance={finance} />;
}
