"use client";

import { ArrowDownLeft, ArrowUpRight, Download, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const PAGE_SIZE = 20;

export default function WalletPage() {
  const [skip, setSkip] = useState(0);

  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: async () => {
      const res = await paymentApi.getWallet();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 30_000,
  });

  const ledgerQuery = useQuery({
    queryKey: ["wallet", "ledger", skip],
    queryFn: async () => {
      const res = await paymentApi.getLedger(skip, PAGE_SIZE);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 15_000,
  });

  const balance = walletQuery.data?.balance;
  const currency = walletQuery.data?.currency ?? "XAF";
  const entries = ledgerQuery.data?.items ?? [];
  const total = ledgerQuery.data?.total ?? 0;
  const hasMore = skip + PAGE_SIZE < total;

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Mon argent"
      title="Portefeuille"
      subtitle="Solde et mouvements lus depuis le ledger serveur."
      actions={
        <div className="wallet-header-actions">
          <Button render={<Link href="/me/wallet/transactions" />} variant="outline" size="sm">
            <Download className="h-4 w-4" /> Historique
          </Button>
          <Button render={<Link href="/me/wallet/export" />} variant="outline" size="sm">
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </div>
      }
    >
      {walletQuery.isStale && !walletQuery.isFetching ? (
        <p className="text-xs text-muted-foreground mb-2" role="status">
          Données en cours de rafraîchissement…
        </p>
      ) : null}
      <div className="wallet-layout">
        <Card className="wallet-balance-card">
          <CardHeader>
            <CardDescription>Solde disponible</CardDescription>
            <CardTitle className="wallet-balance">
              {walletQuery.isLoading ? (
                "…"
              ) : balance !== undefined ? (
                <>
                  {balance.toLocaleString("fr-FR")} <small>{currency}</small>
                </>
              ) : (
                "—"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="wallet-actions">
              <Button variant="secondary" disabled title="Rechargement bientôt disponible">
                <ArrowDownLeft /> Déposer
              </Button>
              <Button variant="outline" disabled>
                <ArrowUpRight /> Retirer
              </Button>
            </div>
            <p className="booking-safety">
              <ShieldCheck /> Solde calculé depuis le ledger, jamais depuis le navigateur.
            </p>
            {walletQuery.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {(walletQuery.error as Error).message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gains</CardTitle>
            <CardDescription>Invisibles tant que non publiés explicitement.</CardDescription>
          </CardHeader>
          <CardContent>
            <strong className="wallet-secondary-value">0 {currency}</strong>
            <div className="wallet-reservation">
              <WalletCards />
              <span>
                <strong>Aucun gain crédité</strong>
                <small>La publication des scores est un parcours séparé (A-SCORING).</small>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="wallet-history">
          <CardHeader>
            <div className="party-card-topline">
              <div>
                <CardTitle>Derniers mouvements</CardTitle>
                <CardDescription>Historique financier personnel</CardDescription>
              </div>
              <Badge variant="outline">Ledger vérifié</Badge>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            {ledgerQuery.isLoading ? (
              <PageState kind="loading" title="Ledger" message="Chargement…" />
            ) : null}
            {ledgerQuery.isError ? (
              <PageState
                kind="error"
                title="Ledger indisponible"
                message={(ledgerQuery.error as Error).message}
              />
            ) : null}
            {!ledgerQuery.isLoading && !ledgerQuery.isError && entries.length === 0 ? (
              <PageState kind="empty" title="Aucun mouvement" message="Le ledger est vide." />
            ) : null}
            {entries.length > 0 ? (
              <>
                <div className="table-scroll" data-scroll-region="wallet-ledger">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead className="text-right">Débit</TableHead>
                        <TableHead className="text-right">Crédit</TableHead>
                        <TableHead className="text-right">Solde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            (window.location.href = `/me/wallet/transactions/${entry.transactionId}`)
                          }
                        >
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell>{entry.reason}</TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 ? formatXaf(entry.debit) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 ? formatXaf(entry.credit) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatXaf(entry.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} sur {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={skip === 0}
                      onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore}
                      onClick={() => setSkip(skip + PAGE_SIZE)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
