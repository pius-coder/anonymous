"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, WalletCards } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/PageState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatXaf, paymentApi } from "@/services/payment/payment-api";
import { useMemo, useState } from "react";

export default function AdminWalletsPage() {
  const [query, setQuery] = useState("");
  const walletsQuery = useQuery({
    queryKey: ["finance-wallets"],
    queryFn: async () => {
      const res = await paymentApi.listWallets({ take: 100 });
      if (!res.success) throw new Error(res.error.message);
      return res.data.wallets;
    },
  });

  const filtered = useMemo(() => {
    const rows = walletsQuery.data ?? [];
    const q = query.toLocaleLowerCase("fr");
    if (!q) return rows;
    return rows.filter(
      (w) =>
        w.id.toLocaleLowerCase("fr").includes(q) ||
        w.userId.toLocaleLowerCase("fr").includes(q),
    );
  }, [query, walletsQuery.data]);

  const total = useMemo(
    () => (walletsQuery.data ?? []).reduce((sum, w) => sum + w.balance, 0),
    [walletsQuery.data],
  );

  return (
    <AppShell
      audience="Finance"
      eyebrow="Ledger"
      title="Comptes wallet"
      subtitle="Les ajustements passent par une écriture compensatoire auditée."
    >
      <Card className="full-height-card">
        <CardHeader>
          <CardTitle>Comptes wallet</CardTitle>
          <CardDescription>
            Soldes serveur — aucun mock. Compensation via commandes finance maker-checker.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <div className="data-table-tools">
            <div className="table-search">
              <Search />
              <Input
                placeholder="Utilisateur ou identifiant wallet…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Badge variant="outline">
              <WalletCards /> {walletsQuery.isLoading ? "…" : formatXaf(total)}
            </Badge>
          </div>
          {walletsQuery.isLoading ? (
            <PageState kind="loading" title="Wallets" message="Lecture serveur…" />
          ) : null}
          {walletsQuery.isError ? (
            <PageState
              kind="error"
              title="Wallets indisponibles"
              message={(walletsQuery.error as Error).message}
            />
          ) : null}
          {!walletsQuery.isLoading && !walletsQuery.isError ? (
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.userId}</TableCell>
                      <TableCell className="font-mono text-xs">{w.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{w.isFrozen ? "Gelé" : "Actif"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatXaf(w.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!filtered.length ? (
                <PageState kind="empty" title="Aucun wallet" message="Aucun portefeuille en base." />
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
