import type { AdminSessionDetail } from "@/services/admin/types";
import { formatDateTime, formatXaf } from "@/app/admin/admin-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminSessionStatsCards({ session }: { session: AdminSessionDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Capacite</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{session.minPlayers}-{session.maxPlayers}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Prix</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{formatXaf(session.entryFeeXaf)}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Version config</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{session.configVersion}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Debut</CardTitle></CardHeader>
        <CardContent className="text-sm font-medium">{formatDateTime(session.startsAt)}</CardContent>
      </Card>
    </div>
  );
}
