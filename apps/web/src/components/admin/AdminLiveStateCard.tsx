import type { AdminSessionDetail } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminLiveStateCard({ session }: { session: AdminSessionDetail }) {
  return (
    <Card>
      <CardHeader><CardTitle className="font-head text-lg uppercase">Etat live</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <p>Phase precedente: {session.liveState?.previousPhase ?? "Non renseignee"}</p>
        <p>Round courant: {session.liveState?.currentRoundId ?? "Non renseigne"}</p>
        <p>Depuis: {formatDateTime(session.liveState?.phaseStartedAt)}</p>
        <p>Pause: {formatDateTime(session.liveState?.pausedAt)}</p>
        {session.liveState?.pauseReason && <p className="md:col-span-2">Raison pause: {session.liveState.pauseReason}</p>}
      </CardContent>
    </Card>
  );
}
