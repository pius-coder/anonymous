import type { Metadata } from "next";
import { getAdminSession } from "@/actions/admin";
import { guardData } from "@/components/layouts/AuthShell";
import { AdminSessionLiveContent } from "@/components/admin/AdminSessionLiveContent";

export const metadata: Metadata = {
  title: "Console live | Admin",
};

export default async function AdminSessionLivePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await guardData(getAdminSession(id));

  return <AdminSessionLiveContent session={session} />;
}
