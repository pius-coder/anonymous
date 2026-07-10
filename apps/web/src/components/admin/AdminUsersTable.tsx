import Link from "next/link";
import type { SupportUserSummary } from "@/services/admin/types";
import { formatDateTime, formatXaf, shortId } from "@/app/admin/admin-format";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/retroui/table";

export function AdminUsersTable({ rows }: { rows: SupportUserSummary[] }) {
  if (rows.length === 0) return <p className="text-muted-foreground">Aucun utilisateur trouve.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Pseudo</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Inscriptions</TableHead>
          <TableHead>Support</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="min-w-0">
                <p className="font-medium">{row.name ?? row.email}</p>
                <p className="font-mono text-xs text-muted-foreground">{shortId(row.id)}</p>
              </div>
            </TableCell>
            <TableCell>{row.profile?.username ?? "Aucun"}</TableCell>
            <TableCell><Badge variant="outline">{row.role}</Badge></TableCell>
            <TableCell>{row.isActive ? "Actif" : "Suspendu"}</TableCell>
            <TableCell>{row.registrationsCount}</TableCell>
            <TableCell>{row.supportCasesCount}</TableCell>
            <TableCell>{row.wallet ? `${formatXaf(row.wallet.balanceXaf, row.wallet.currency)}${row.wallet.isFrozen ? " · gele" : ""}` : "Aucun"}</TableCell>
            <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            <TableCell>
              <Link href={`/admin/users/${encodeURIComponent(row.id)}`}>
                <Button size="sm" variant="outline">Detail</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
