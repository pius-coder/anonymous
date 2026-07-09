import type { Metadata } from "next";
import Link from "next/link";
import { adminApiGet, queryString } from "../admin-api";
import { formatDateTime, formatXaf, shortId } from "../admin-format";
import type { AdminRole, Paginated, SupportUserSummary } from "../admin-types";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Input } from "@/components/retroui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/retroui/table";

export const metadata: Metadata = {
  title: "Utilisateurs | Admin",
};

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ q?: string; role?: AdminRole }>;
}) {
  const { q, role } = await props.searchParams;
  const users = await adminApiGet<Paginated<SupportUserSummary>>(
    `/v1/admin/support/users${queryString({ q, role, limit: 50 })}`,
  );
  const rows = users?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Support</Badge>
        <h1 className="mt-2 text-3xl font-black uppercase">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          {users ? `${users.meta.total} compte(s) trouve(s)` : "Donnees indisponibles"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Recherche utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex max-w-4xl flex-wrap gap-2">
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="email, nom, pseudo, telephone ou user id"
            />
            <select
              name="role"
              defaultValue={role ?? ""}
              className="h-10 rounded-md border-2 border-border bg-background px-3 text-sm"
            >
              <option value="">Tous les roles</option>
              <option value="PLAYER">PLAYER</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="FINANCE">FINANCE</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            <Button type="submit">Chercher</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-head text-lg uppercase">Comptes inscrits</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">Aucun utilisateur trouve.</p>
          ) : (
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
                    <TableCell>
                      <Badge variant="outline">{row.role}</Badge>
                    </TableCell>
                    <TableCell>{row.isActive ? "Actif" : "Suspendu"}</TableCell>
                    <TableCell>{row.registrationsCount}</TableCell>
                    <TableCell>{row.supportCasesCount}</TableCell>
                    <TableCell>
                      {row.wallet
                        ? `${formatXaf(row.wallet.balanceXaf, row.wallet.currency)}${row.wallet.isFrozen ? " · gele" : ""}`
                        : "Aucun"}
                    </TableCell>
                    <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/users/${encodeURIComponent(row.id)}`}>
                        <Button size="sm" variant="outline">
                          Detail
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
