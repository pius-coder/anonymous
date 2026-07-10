import Link from "next/link";
import type { AdminSession } from "@/services/admin/types";
import { formatDateTime, formatXaf } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminSessionsTable({ sessions }: { sessions: AdminSession[] }) {
  if (sessions.length === 0) return <p className="text-muted-foreground">Aucune session dans ce filtre.</p>;

  return (
    <Table className="min-w-[980px]">
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
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell className="font-mono">{session.code}</TableCell>
            <TableCell className="font-medium">{session.name}</TableCell>
            <TableCell><Badge variant="outline">{session.status}</Badge></TableCell>
            <TableCell>{session.paidRegistrationsCount ?? 0}/{session.maxPlayers}</TableCell>
            <TableCell>{formatXaf(session.entryFeeXaf)}</TableCell>
            <TableCell>{formatDateTime(session.startsAt)}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Link href={`/admin/sessions/${session.id}`}><Button size="sm" variant="outline">Detail</Button></Link>
                <Link href={`/admin/sessions/${session.id}/live`}><Button size="sm" variant="outline">Live</Button></Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
