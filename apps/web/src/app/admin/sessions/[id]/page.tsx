import type { Metadata } from "next";
import { getAdminSession } from "@/actions/admin";
import { guardData } from "@/components/layouts/AuthShell";
import { AdminSessionDetailContent } from "@/components/admin/AdminSessionDetailContent";

export const metadata: Metadata = {
  title: "Session | Admin",
};

export default async function AdminSessionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await guardData(getAdminSession(id));

  return <AdminSessionDetailContent session={session} />;
}
