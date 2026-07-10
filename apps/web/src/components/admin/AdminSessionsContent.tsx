import Link from "next/link";
import type { AdminSession } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminSessionsTable } from "@/components/admin/AdminSessionsTable";

export function AdminSessionsContent({ sessions, total }: { sessions: AdminSession[]; total: number }) {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Badge variant="outline">Gestion</Badge>
          <h1 className="mt-2 truncate text-3xl font-black uppercase">Sessions</h1>
          <p className="text-sm text-muted-foreground">{total > 0 ? `${total} session(s) trouvee(s)` : "Donnees indisponibles"}</p>
        </div>
        <Link href="/admin/sessions/new" className="shrink-0">
          <Button className="w-full sm:w-auto">+ Nouvelle session</Button>
        </Link>
      </div>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="font-head text-lg uppercase">Liste des sessions</CardTitle></CardHeader>
        <CardContent><AdminSessionsTable sessions={sessions} /></CardContent>
      </Card>
    </div>
  );
}
