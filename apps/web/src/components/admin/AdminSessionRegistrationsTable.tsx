import Link from "next/link";
import type { AdminSessionDetail } from "@/services/admin/types";
import { formatDateTime, shortId } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminSessionRegistrationsTable({ session }: { session: AdminSessionDetail }) {
  if (session.registrations.length === 0) return <p className="text-muted-foreground">Aucune inscription.</p>;

  return (
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
              <Link href={`/admin/users/${encodeURIComponent(registration.user.id)}`} className="underline underline-offset-2">
                {registration.user.name ?? registration.user.email}
              </Link>
            </TableCell>
            <TableCell><Badge variant="outline">{registration.status}</Badge></TableCell>
            <TableCell>{registration.payment ? shortId(registration.payment.id) : "Aucun"}</TableCell>
            <TableCell>{formatDateTime(registration.checkedInAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
