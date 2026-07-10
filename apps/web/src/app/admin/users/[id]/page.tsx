import type { Metadata } from "next";
import { getAdminUser } from "@/actions/admin";
import { guardData } from "@/components/layouts/AuthShell";
import { AdminUserDetailContent } from "@/components/admin/AdminUserDetailContent";

export const metadata: Metadata = {
  title: "Utilisateur | Admin",
};

export default async function AdminUserDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await guardData(getAdminUser(id));

  return <AdminUserDetailContent user={user} />;
}
