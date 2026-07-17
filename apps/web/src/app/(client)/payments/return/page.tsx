"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { mapPaymentStatusLabel, paymentApi } from "@/services/payment/payment-api";

function PaymentReturnInner() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");

  const statusQuery = useQuery({
    queryKey: ["payment-return", paymentId],
    enabled: Boolean(paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "SUCCESSFUL" || status === "FAILED" || status === "EXPIRED") return false;
      return 2_000;
    },
    queryFn: async () => {
      if (!paymentId) throw new Error("missing paymentId");
      const res = await paymentApi.getStatus(paymentId);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  if (!paymentId) {
    return (
      <PageState
        kind="error"
        title="Retour paiement"
        message="Identifiant de paiement manquant. Revenez depuis votre partie."
      />
    );
  }

  if (statusQuery.isLoading) {
    return (
      <PageState kind="loading" title="Vérification du paiement" message="Interrogation du serveur…" />
    );
  }

  if (statusQuery.isError) {
    return (
      <PageState
        kind="error"
        title="Impossible de vérifier le paiement"
        message={(statusQuery.error as Error).message}
      />
    );
  }

  const payment = statusQuery.data!;
  const label = mapPaymentStatusLabel(payment.status);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Retour checkout Fapshi</CardTitle>
        <CardDescription>
          Le statut affiché vient exclusivement du serveur (jamais du navigateur seul).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Statut : <strong>{label}</strong>
        </p>
        <p className="text-sm text-muted-foreground">Référence interne : {payment.id}</p>
        {payment.status === "PENDING" || payment.status === "CREATED" ? (
          <PageState
            kind="loading"
            title="Paiement en cours"
            message="En attente de confirmation fournisseur. Ne relancez pas un second paiement."
          />
        ) : null}
        {payment.status === "SUCCESSFUL" ? (
          <PageState kind="success" title="Paiement confirmé" message="Vous pouvez rejoindre la préparation." />
        ) : null}
        {payment.status === "FAILED" || payment.status === "EXPIRED" ? (
          <PageState
            kind="error"
            title="Paiement non abouti"
            message="Le serveur a enregistré un échec ou une expiration."
          />
        ) : null}
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground"
        >
          Retour à l&apos;accueil
        </Link>
      </CardContent>
    </Card>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <PageState kind="loading" title="Retour paiement" message="Chargement…" />
      }
    >
      <PaymentReturnInner />
    </Suspense>
  );
}
