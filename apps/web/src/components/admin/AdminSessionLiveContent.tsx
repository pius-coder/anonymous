import type { AdminSessionDetail } from "@/services/admin/types";
import { LiveControlActions } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminLiveStatsCards } from "@/components/admin/AdminLiveStatsCards";
import { AdminLiveStateCard } from "@/components/admin/AdminLiveStateCard";
import { AdminLivePlayersTable } from "@/components/admin/AdminLivePlayersTable";

export function AdminSessionLiveContent({ session }: { session: AdminSessionDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">{session.status}</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">{session.name}</h1>
        <p className="text-sm text-muted-foreground">Console live · {session.code}</p>
      </div>
      <AdminLiveStatsCards session={session} />
      <LiveControlActions sessionId={session.id} />
      <AdminLiveStateCard session={session} />
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Joueurs</CardTitle></CardHeader>
        <CardContent><AdminLivePlayersTable session={session} /></CardContent>
      </Card>
    </div>
  );
}
