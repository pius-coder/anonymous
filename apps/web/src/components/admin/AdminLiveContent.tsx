import type { AdminSession } from "@/services/admin/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { AdminLiveTable } from "@/components/admin/AdminLiveTable";

export function AdminLiveContent({ sessions }: { sessions: AdminSession[] }) {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Live</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Live control</h1>
        <p className="text-sm text-muted-foreground">Sessions actives, en attente et live.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="font-head text-lg uppercase">Sessions supervisables</CardTitle></CardHeader>
        <CardContent><AdminLiveTable sessions={sessions} /></CardContent>
      </Card>
    </div>
  );
}
