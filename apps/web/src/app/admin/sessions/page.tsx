import type { Metadata } from "next";
import { getAdminSessions } from "@/actions/admin";
import { AdminSessionsContent } from "@/components/admin/AdminSessionsContent";

export const metadata: Metadata = {
  title: "Sessions | Admin",
};

export default async function AdminSessionsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await props.searchParams;
  const sessions = await getAdminSessions({ status, limit: "50" });
  const rows = sessions?.data ?? [];
  const total = sessions?.meta?.total ?? 0;

  return <AdminSessionsContent sessions={rows} total={total} />;
}
