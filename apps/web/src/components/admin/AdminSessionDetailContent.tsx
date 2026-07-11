import Link from "next/link";
import type { AdminSessionDetail } from "@/services/admin/types";
import { SessionLifecycleActions } from "@/components/admin/AdminActionForms";
import { AdminVisibilityControl } from "@/components/admin/AdminVisibilityControl";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminSessionStatsCards } from "@/components/admin/AdminSessionStatsCards";
import { AdminSessionRegistrationsTable } from "@/components/admin/AdminSessionRegistrationsTable";
import { AdminSessionRoundsTable } from "@/components/admin/AdminSessionRoundsTable";

export function AdminSessionDetailContent({ session }: { session: AdminSessionDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{session.status}</Badge>
            <Badge variant={session.visibility === "PUBLIC" ? "default" : "secondary"}>
              {session.visibility}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase">{session.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{session.code}</p>
        </div>
        <Link href={`/admin/sessions/${session.id}/live`}>
          <Button variant="outline">Console live</Button>
        </Link>
      </div>
      <AdminSessionStatsCards session={session} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SessionLifecycleActions session={session} />
        <AdminVisibilityControl session={session} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSessionRegistrationsTable session={session} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Programme</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSessionRoundsTable session={session} />
        </CardContent>
      </Card>
    </div>
  );
}
