"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { formatXaf, mapPaymentStatusLabel, paymentApi } from "@/services/payment/payment-api";

export default function TransactionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const detailQuery = useQuery({
    queryKey: ["wallet", "transaction", id],
    queryFn: async () => {
      const res = await paymentApi.getTransactionDetail(id);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const tx = detailQuery.data;

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
      title="Détail transaction"
      subtitle="Information complète d'une opération"
      actions={
        <Button render={<Link href="/me/wallet" />} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      }
    >
      {detailQuery.isLoading ? (
        <PageState kind="loading" title="Transaction" message="Chargement…" />
      ) : null}

      {detailQuery.isError ? (
        <PageState
          kind="error"
          title="Transaction introuvable"
          message={(detailQuery.error as Error).message}
        />
      ) : null}

      {tx ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
              <CardDescription>Montant et statut</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">{formatXaf(tx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut</span>
                <Badge variant={labelVariant[tx.status] ?? "outline"}>
                  {mapPaymentStatusLabel(tx.status)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{tx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fournisseur</span>
                <span>{tx.provider ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono text-xs">{tx.reference ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clé idempotence</span>
                <span className="font-mono text-xs">{tx.idempotencyKey ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chronologie</CardTitle>
              <CardDescription>Dates et règlement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée le</span>
                <span>{new Date(tx.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expire le</span>
                <span>{tx.expiresAt ? new Date(tx.expiresAt).toLocaleString("fr-FR") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Réglée le</span>
                <span>{tx.settledAt ? new Date(tx.settledAt).toLocaleString("fr-FR") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut interne</span>
                <span className="font-mono text-xs">{tx.internalStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut wire</span>
                <span className="font-mono text-xs">{tx.wireStatus}</span>
              </div>
              {tx.checkoutUrl ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Checkout</span>
                  <a
                    href={tx.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ouvrir <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Contexte</CardTitle>
              <CardDescription>Partie et participation liées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partie</span>
                <span>{tx.partyId ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participation</span>
                <span>{tx.participationId ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span>{tx.serviceKind}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Portefeuille</span>
                <span className="font-mono text-xs">{tx.walletId ?? "—"}</span>
              </div>
              {tx.providerTransId ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction fournisseur</span>
                  <span className="font-mono text-xs">{tx.providerTransId}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}
