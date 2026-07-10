import type { SupportUser } from "@/services/admin/types";
import { formatDateTime, formatXaf, shortId } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminUserPaymentsTable({ user }: { user: SupportUser }) {
  if (user.payments.length === 0) return <p className="text-muted-foreground">Aucun paiement.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {user.payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-mono">{shortId(payment.id)}</TableCell>
            <TableCell>{formatXaf(payment.amountXaf, payment.currency)}</TableCell>
            <TableCell><Badge variant="outline">{payment.status}</Badge></TableCell>
            <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
