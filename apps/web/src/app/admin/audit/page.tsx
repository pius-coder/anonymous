import type { Metadata } from "next";
import { getAdminAuditLogs } from "@/actions/admin";
import { AdminAuditContent } from "@/components/admin/AdminAuditContent";

export const metadata: Metadata = {
  title: "Audit logs | Admin",
};

export default async function AdminAuditPage(props: {
  searchParams: Promise<{ action?: string; entity?: string; entityId?: string; requestId?: string }>;
}) {
  const search = await props.searchParams;
  const result = await getAdminAuditLogs({ ...search, limit: "50" });
  const entries = result?.data ?? [];

  return <AdminAuditContent entries={entries} search={search} />;
}
