import type { Metadata } from "next";
import Link from "next/link";
import { adminApiGet, queryString } from "../admin-api";
import { formatDateTime } from "../admin-format";
import type { AdminSession, Paginated } from "../admin-types";
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
  title: "Live control | Admin",
};

export default async function AdminLivePage() {
  const [live, waiting, active] = await Promise.all([
    adminApiGet<Paginated<AdminSession>>(`/v1/admin/sessions${queryString({ status: "LIVE", limit: 20 })}`),
    adminApiGet<Paginated<AdminSession>>(`/v1/admin/sessions${queryString({ status: "WAITING_START", limit: 20 })}`),
    adminApiGet<Paginated<AdminSession>>(`/v1/admin/sessions${queryString({ status: "ACTIVE", limit: 20 })}`),
  ]);
  const rows = [...(live?.data ?? []), ...(waiting?.data ?? []), ...(active?.data ?? [])];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Live</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Live control</h1>
        <p className="text-sm text-muted-foreground">Sessions actives, en attente et live.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Sessions supervisables</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">Aucune session live ou active.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono">{session.code}</TableCell>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(session.startsAt)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/sessions/${session.id}/live`}>
                        <Button size="sm" variant="outline">
                          Ouvrir
                        </Button>
                      </Link>
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
