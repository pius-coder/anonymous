import type { SupportUser } from "@/services/admin/types";
import { formatXaf } from "@/app/admin/admin-format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminUserLedgerTable({ user }: { user: SupportUser }) {
  if (!user.wallet?.ledgers.length) return <p className="text-muted-foreground">Ledger non disponible.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {user.wallet.ledgers.map((ledger) => (
          <TableRow key={ledger.id}>
            <TableCell>{ledger.type}</TableCell>
            <TableCell>{ledger.direction}</TableCell>
            <TableCell>{formatXaf(ledger.amountXaf, user.wallet?.currency ?? "XAF")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
