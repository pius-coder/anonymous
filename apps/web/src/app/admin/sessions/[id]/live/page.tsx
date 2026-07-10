import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminApiGet } from "../../../admin-api";
import { formatDateTime, formatXaf } from "../../../admin-format";
import type { AdminSessionDetail } from "../../../admin-types";
import { LiveControlActions } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Console live | Admin",
};

export default async function AdminSessionLivePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await adminApiGet<{ session: AdminSessionDetail }>(`/v1/admin/sessions/${id}`);
  const session = result?.session;
  if (!session) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">{session.status}</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">{session.name}</h1>
        <p className="text-sm text-muted-foreground">Console live · {session.code}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Phase</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{session.liveState?.phase ?? "Non live"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Inscrits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{session.registrations.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Resultats</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{session.results.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatXaf(session.commissionRecord?.netCollectionXaf ?? 0)}
          </CardContent>
        </Card>
      </div>

      <LiveControlActions sessionId={session.id} />

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Etat live</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>Phase precedente: {session.liveState?.previousPhase ?? "Non renseignee"}</p>
          <p>Round courant: {session.liveState?.currentRoundId ?? "Non renseigne"}</p>
          <p>Depuis: {formatDateTime(session.liveState?.phaseStartedAt)}</p>
          <p>Pause: {formatDateTime(session.liveState?.pausedAt)}</p>
          {session.liveState?.pauseReason && <p className="md:col-span-2">Raison pause: {session.liveState.pauseReason}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Joueurs</CardTitle>
        </CardHeader>
        <CardContent>
          {session.registrations.length === 0 ? (
            <p className="text-muted-foreground">Aucun joueur inscrit.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid size-9 overflow-hidden border-2 border-border bg-muted">
                          {registration.user.profile?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={registration.user.profile.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="place-self-center font-head text-xs">
                              {(registration.user.profile?.username ?? registration.user.name ?? "P")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {registration.user.profile?.username ?? registration.user.name ?? registration.user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{registration.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{registration.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(registration.checkedInAt)}</TableCell>
                    <TableCell>{formatDateTime(registration.inRoomAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
