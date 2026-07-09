import type { Metadata } from "next";
import Link from "next/link";
import { adminApiGet, queryString } from "../admin-api";
import { formatDateTime, formatXaf } from "../admin-format";
import type { AdminSession, Paginated } from "../admin-types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Button } from "@/components/retroui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Sessions | Admin",
};

export default async function AdminSessionsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await props.searchParams;
  const sessions = await adminApiGet<Paginated<AdminSession>>(
    `/v1/admin/sessions${queryString({ status, limit: 50 })}`,
  );
  const rows = sessions?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline">Gestion</Badge>
          <h1 className="mt-2 text-3xl font-black uppercase">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {sessions ? `${sessions.meta.total} session(s) trouvee(s)` : "Donnees indisponibles"}
          </p>
        </div>
        <Link href="/admin/sessions/new">
          <Button>+ Nouvelle session</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Liste des sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">Aucune session dans ce filtre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Places</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono">{session.code}</TableCell>
                    <TableCell className="font-medium">{session.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {session.paidRegistrationsCount ?? 0}/{session.maxPlayers}
                    </TableCell>
                    <TableCell>{formatXaf(session.entryFeeXaf)}</TableCell>
                    <TableCell>{formatDateTime(session.startsAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/sessions/${session.id}`}>
                          <Button size="sm" variant="outline">
                            Detail
                          </Button>
                        </Link>
                        <Link href={`/admin/sessions/${session.id}/live`}>
                          <Button size="sm" variant="outline">
                            Live
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
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
