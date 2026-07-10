import type { Metadata } from "next";
import { getAdminDashboard } from "@/actions/admin";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";

export const metadata: Metadata = {
  title: "Admin Operations | Session Jeu",
  description: "Tableau de bord operations, audit et support pour Session Jeu.",
};

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();
  return <AdminDashboardContent dashboard={dashboard} />;
}
