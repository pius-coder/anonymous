import type { AdminSessionDetail } from "@/services/admin/types";
import { formatXaf } from "@/app/admin/admin-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminLiveStatsCards({ session }: { session: AdminSessionDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Phase</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{session.liveState?.phase ?? "Non live"}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Inscrits</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{session.registrations.length}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Resultats</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{session.results.length}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Net</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{formatXaf(session.commissionRecord?.netCollectionXaf ?? 0)}</CardContent>
      </Card>
    </div>
  );
}
