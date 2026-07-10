import Link from "next/link";
import type { PaymentTransaction } from "@/services/admin/types";
import { formatDateTime, formatXaf, shortId } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";
import { PaymentReconcileForm } from "@/components/admin/AdminActionForms";

export function AdminPaymentsTable({ payments }: { payments: PaymentTransaction[] }) {
  if (payments.length === 0) return <p className="text-muted-foreground">Aucune transaction.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Joueur</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-mono">{shortId(payment.id)}</TableCell>
            <TableCell>
              <Link href={`/admin/users/${encodeURIComponent(payment.user.id)}`} className="underline underline-offset-2">
                {payment.user.name ?? payment.user.email}
              </Link>
            </TableCell>
            <TableCell>{payment.session?.code ?? "Aucune"}</TableCell>
            <TableCell>{formatXaf(payment.amountXaf, payment.currency)}</TableCell>
            <TableCell><Badge variant="outline">{payment.status}</Badge></TableCell>
            <TableCell>{shortId(payment.providerTransId)}</TableCell>
            <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
            <TableCell><PaymentReconcileForm paymentId={payment.id} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
