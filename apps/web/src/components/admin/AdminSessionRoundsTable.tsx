import type { AdminSessionDetail } from "@/services/admin/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminSessionRoundsTable({ session }: { session: AdminSessionDetail }) {
  if (session.rounds.length === 0) return <p className="text-muted-foreground">Aucun round configure.</p>;

  return (
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
  );
}
