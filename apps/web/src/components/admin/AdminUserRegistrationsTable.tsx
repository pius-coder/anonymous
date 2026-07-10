import Link from "next/link";
import type { SupportUser } from "@/services/admin/types";
import { formatDateTime } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminUserRegistrationsTable({ user }: { user: SupportUser }) {
  if (user.registrations.length === 0) return <p className="text-muted-foreground">Aucune inscription.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {user.registrations.map((registration) => (
          <TableRow key={registration.id}>
            <TableCell>
              <Link href={`/admin/sessions/${registration.session.id}`} className="underline underline-offset-2">
                {registration.session.code}
              </Link>
            </TableCell>
            <TableCell><Badge variant="outline">{registration.status}</Badge></TableCell>
            <TableCell>{formatDateTime(registration.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
