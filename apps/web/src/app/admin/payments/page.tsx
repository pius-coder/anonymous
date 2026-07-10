import type { Metadata } from "next";
import { getAdminPayments } from "@/actions/admin";
import { AdminPaymentsContent } from "@/components/admin/AdminPaymentsContent";

export const metadata: Metadata = {
  title: "Paiements | Admin",
};

export default async function AdminPaymentsPage(props: {
  searchParams: Promise<{ status?: string; userId?: string; sessionId?: string }>;
}) {
  const search = await props.searchParams;
  const payments = await getAdminPayments({ ...search, limit: "50" });
  const rows = payments?.data ?? [];
  const total = payments?.meta?.total ?? 0;

  return <AdminPaymentsContent payments={rows} total={total} />;
}
