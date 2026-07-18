"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mapPaymentStatusLabel, paymentApi } from "@/services/payment/payment-api";
import { mapPaymentToFinanceRow } from "./finance-data";

export function TransactionDetail({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["admin-payment", transactionId],
    queryFn: async () => {
      const res = await paymentApi.getAdminPayment(transactionId);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const [stepUp, setStepUp] = useState("");
  const [compPhone, setCompPhone] = useState("");

  const reconcileMutation = useMutation({
    mutationFn: async (why: string) => {
      const res = await paymentApi.reconcile(transactionId, why);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: async () => {
      setOpen(false);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-payment", transactionId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    },
  });

  const expireMutation = useMutation({
    mutationFn: async () => {
      const res = await paymentApi.expire(
        transactionId,
        reason.trim() || "expire_manual",
        paymentApi.newIdempotencyKey("expire"),
        stepUp,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payment", transactionId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    },
  });

  const compensationMutation = useMutation({
    mutationFn: async () => {
      const res = await paymentApi.requestCompensation(
        transactionId,
        {
          reason: reason.trim(),
          beneficiaryPhone: compPhone || undefined,
          beneficiaryVerified: Boolean(compPhone),
          idempotencyKey: paymentApi.newIdempotencyKey("comp"),
        },
        stepUp,
      );
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payment", transactionId] });
      await queryClient.invalidateQueries({ queryKey: ["finance-mismatches"] });
    },
  });

  if (detailQuery.isLoading) {
    return <PageState kind="loading" title="Transaction" message="Chargement serveur…" />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageState
        kind="error"
        title="Transaction introuvable"
        message={(detailQuery.error as Error | undefined)?.message ?? "Erreur serveur"}
      />
    );
  }

  const payment = detailQuery.data;
  const transaction = mapPaymentToFinanceRow(payment);
  const terminal = payment.status === "SUCCESSFUL" || payment.status === "FAILED";
  const canReconcile = payment.status === "PENDING";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/finance" />}>
              <ArrowLeft /> Ledger
            </Button>
            <Badge variant={terminal && payment.status === "SUCCESSFUL" ? "default" : "destructive"}>
              {mapPaymentStatusLabel(payment.status)}
            </Badge>
          </div>
          <CardTitle className="font-mono text-base">{payment.id}</CardTitle>
          <CardDescription>
            Statut provider et ledger lus depuis le serveur — jamais inventés dans l’UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Montant serveur</dt>
              <dd className="font-medium">{transaction.amount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{payment.type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium">{payment.provider ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Référence redigée</dt>
              <dd className="font-mono text-xs">{transaction.providerRef}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ledger</dt>
              <dd className="font-medium">{transaction.ledgerStatus}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Créé</dt>
              <dd className="font-medium">{transaction.date}</dd>
            </div>
          </dl>

          {payment.status === "PENDING" ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>En attente de confirmation</AlertTitle>
              <AlertDescription>
                Seule une réconciliation finance autorisée et auditée peut clôturer ce PENDING.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="step-up">
              Step-up finance (X-Finance-Step-Up)
            </label>
            <Input
              id="step-up"
              value={stepUp}
              onChange={(e) => setStepUp(e.target.value)}
              placeholder="Jeton step-up / MFA"
              autoComplete="off"
            />
          </div>

          {canReconcile ? (
            <>
              <Button className="w-full" onClick={() => setOpen(true)} disabled={reconcileMutation.isPending}>
                <RefreshCw /> Confirmer le retry / rapprochement idempotent
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={!stepUp || expireMutation.isPending}
                onClick={() => expireMutation.mutate()}
              >
                Expirer (provider + local)
              </Button>
              {expireMutation.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {(expireMutation.error as Error).message}
                </p>
              ) : null}
              <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Réconcilier la transaction</AlertDialogTitle>
                    <AlertDialogDescription>
                      Action finance audité. Le serveur interroge le provider puis enregistre
                      MATCH/MISMATCH sans inventer un succès client.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motif de rapprochement (obligatoire)"
                    aria-label="Motif de réconciliation"
                  />
                  {reconcileMutation.isError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {(reconcileMutation.error as Error).message}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!reason.trim() || reconcileMutation.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        reconcileMutation.mutate(reason.trim());
                      }}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}

          {payment.status === "SUCCESSFUL" ? (
            <div className="space-y-2">
              <Input
                value={compPhone}
                onChange={(e) => setCompPhone(e.target.value)}
                placeholder="Téléphone bénéficiaire (compensation payout)"
              />
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motif compensation (maker — checker distinct requis)"
              />
              <Button
                className="w-full"
                variant="secondary"
                disabled={!reason.trim() || !stepUp || compensationMutation.isPending}
                onClick={() => compensationMutation.mutate()}
              >
                Demander compensation (maker)
              </Button>
              {compensationMutation.isSuccess ? (
                <p className="text-sm text-primary" role="status">
                  Demande {compensationMutation.data.reconciliationId} — en attente checker.
                </p>
              ) : null}
              {compensationMutation.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  {(compensationMutation.error as Error).message}
                </p>
              ) : null}
            </div>
          ) : null}

          {terminal && payment.status !== "SUCCESSFUL" ? (
            <p className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 shrink-0" />
              Transaction terminale — lecture seule, aucun double crédit possible via l’UI.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> Audit
          </CardTitle>
          <CardDescription>Traçabilité côté serveur (middleware + use-case).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2">
            <ShieldCheck className="size-4 shrink-0" />
            Les gains restent invisibles tant que les scores ne sont pas publiés explicitement.
          </p>
          <p>
            Rapprochement : statut courant <strong>{mapPaymentStatusLabel(payment.status)}</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
