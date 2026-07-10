import type { Metadata } from "next";
import { getAdminSessions } from "@/actions/admin";
import { AdminLiveContent } from "@/components/admin/AdminLiveContent";

export const metadata: Metadata = {
  title: "Live control | Admin",
};

export default async function AdminLivePage() {
  const [live, waiting, active] = await Promise.all([
    getAdminSessions({ status: "LIVE", limit: "20" }),
    getAdminSessions({ status: "WAITING_START", limit: "20" }),
    getAdminSessions({ status: "ACTIVE", limit: "20" }),
  ]);
  const rows = [...(live?.data ?? []), ...(waiting?.data ?? []), ...(active?.data ?? [])];

  return <AdminLiveContent sessions={rows} />;
}
