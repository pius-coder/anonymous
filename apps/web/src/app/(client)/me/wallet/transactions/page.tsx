"use client";

import { ArrowLeft } from "lucide-react";
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
import { formatXaf, mapPaymentStatusLabel, paymentApi } from "@/services/payment/payment-api";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [skip, setSkip] = useState(0);

  const query = useQuery({
    queryKey: ["wallet", "transactions", skip],
    queryFn: async () => {
      const res = await paymentApi.getTransactions(skip, PAGE_SIZE);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const hasMore = skip + PAGE_SIZE < total;

  const labelVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    SUCCESSFUL: "default",
    PENDING: "secondary",
    FAILED: "destructive",
    EXPIRED: "outline",
    REFUNDED: "outline",
  };

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Mon argent"
      title="Transactions"
      subtitle="Historique complet des paiements"
      actions={
        <Button render={<Link href="/me/wallet" />} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" /> Portefeuille
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Toutes les transactions</CardTitle>
          <CardDescription>Paiements, rechargements et mouvements</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          {query.isLoading ? (
            <PageState kind="loading" title="Transactions" message="Chargement…" />
          ) : null}
          {query.isError ? (
            <PageState kind="error" title="Erreur" message={(query.error as Error).message} />
          ) : null}
          {!query.isLoading && !query.isError && items.length === 0 ? (
            <PageState
              kind="empty"
              title="Aucune transaction"
              message="Aucun mouvement enregistré."
            />
          ) : null}
          {items.length > 0 ? (
            <>
              <div className="table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((tx) => (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => (window.location.href = `/me/wallet/transactions/${tx.id}`)}
                      >
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell>{tx.type}</TableCell>
                        <TableCell>
                          <Badge variant={labelVariant[tx.status] ?? "outline"}>
                            {mapPaymentStatusLabel(tx.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatXaf(tx.amount)}
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
    </AppShell>
  );
}
