import Link from "next/link";
import type { AdminSession } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminLiveTable({ sessions }: { sessions: AdminSession[] }) {
  if (sessions.length === 0) return <p className="text-muted-foreground">Aucune session live ou active.</p>;

  return (
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
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell className="font-mono">{session.code}</TableCell>
            <TableCell>{session.name}</TableCell>
            <TableCell><Badge variant="outline">{session.status}</Badge></TableCell>
            <TableCell>{formatDateTime(session.startsAt)}</TableCell>
            <TableCell>
              <Link href={`/admin/sessions/${session.id}/live`}><Button size="sm" variant="outline">Ouvrir</Button></Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
