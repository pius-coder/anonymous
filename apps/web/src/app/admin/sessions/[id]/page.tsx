import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminApiGet } from "../../admin-api";
import { formatDateTime, formatXaf, shortId } from "../../admin-format";
import type { AdminSessionDetail } from "../../admin-types";
import { SessionLifecycleActions } from "@/components/admin/AdminActionForms";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
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
  title: "Session | Admin",
};

export default async function AdminSessionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const result = await adminApiGet<{ session: AdminSessionDetail }>(`/v1/admin/sessions/${id}`);
  const session = result?.session;
  if (!session) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline">{session.status}</Badge>
          <h1 className="mt-2 text-3xl font-black uppercase">{session.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{session.code}</p>
        </div>
        <Link href={`/admin/sessions/${session.id}/live`}>
          <Button variant="outline">Console live</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Capacite</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {session.minPlayers}-{session.maxPlayers}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Prix</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatXaf(session.entryFeeXaf)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Version config</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{session.configVersion}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Debut</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">{formatDateTime(session.startsAt)}</CardContent>
        </Card>
      </div>

      <SessionLifecycleActions session={session} />

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Inscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {session.registrations.length === 0 ? (
            <p className="text-muted-foreground">Aucune inscription.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <Link
                        href={`/admin/users/${encodeURIComponent(registration.user.id)}`}
                        className="underline underline-offset-2"
                      >
                        {registration.user.name ?? registration.user.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{registration.status}</Badge>
                    </TableCell>
                    <TableCell>{registration.payment ? shortId(registration.payment.id) : "Aucun"}</TableCell>
                    <TableCell>{formatDateTime(registration.checkedInAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Programme</CardTitle>
        </CardHeader>
        <CardContent>
          {session.rounds.length === 0 ? (
            <p className="text-muted-foreground">Aucun round configure.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Mini-jeu</TableHead>
                  <TableHead>Duree</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.rounds.map((round) => (
                  <TableRow key={round.id}>
                    <TableCell>{round.order}</TableCell>
                    <TableCell>{round.miniGameName}</TableCell>
                    <TableCell>{Math.round(round.durationMs / 1000)}s</TableCell>
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
