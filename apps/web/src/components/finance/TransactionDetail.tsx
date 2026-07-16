"use client";

import Link from "next/link";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { FinanceTransaction } from "./finance-data";

export function TransactionDetail({ transaction }: { transaction: FinanceTransaction }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reconciled, setReconciled] = useState(transaction.reconciliation === "Rapprochée");
  const [audit, setAudit] = useState([
    {
      time: "15:44",
      actor: "Système",
      action: "Lecture provider actualisée",
      reason: "Vérification planifiée",
    },
  ]);

  function reconcile() {
    if (!reason.trim()) return;
    setReconciled(true);
    setAudit((rows) => [
      {
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        actor: "Inès T.",
        action: "Retry idempotent confirmé",
        reason: reason.trim(),
      },
      ...rows,
    ]);
    setReason("");
    setOpen(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" render={<Link href="/finance" />}>
          <ArrowLeft /> Retour au ledger
        </Button>
        <Badge variant={reconciled ? "default" : "destructive"}>
          {reconciled ? "Rapprochée" : transaction.reconciliation}
        </Badge>
      </div>
      {reconciled ? (
        <Alert status="success">
          <CheckCircle2 />
          <AlertTitle>Transaction rapprochée</AlertTitle>
          <AlertDescription>
            L’état local et l’état provider ont été comparés. La piste d’audit conserve la raison et
            la clé idempotente redigée.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert status="warning">
          <TriangleAlert />
          <AlertTitle>Écart à vérifier</AlertTitle>
          <AlertDescription>
            Aucun mouvement supplémentaire ne sera créé sans confirmation explicite d’un retry
            idempotent.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{transaction.id}</CardTitle>
            <CardDescription>
              {transaction.type} · {transaction.user} · {transaction.party}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Montant" value={transaction.amount} />
            <Field label="Statut public" value={transaction.status} />
            <Field label="Statut provider" value={transaction.providerStatus} />
            <Field label="Mouvement ledger" value={transaction.ledgerStatus} />
            <Field label="Référence provider" value={transaction.providerRef} mono />
            <Field label="Clé idempotente" value={transaction.idempotency} mono />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Réconciliation</CardTitle>
            <CardDescription>
              Comparaison uniquement; aucune édition directe du ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <CheckLine label="Montant local/provider" ok={transaction.status !== "Échoué"} />
              <CheckLine
                label="Mouvement wallet"
                ok={transaction.ledgerStatus !== "Aucun mouvement"}
              />
              <CheckLine label="Référence idempotente" ok />
            </div>
            <Button className="w-full" disabled={reconciled} onClick={() => setOpen(true)}>
              <RefreshCw /> {reconciled ? "Déjà rapprochée" : "Confirmer le retry idempotent"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Piste d’audit finance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {audit.map((row, index) => (
            <div
              key={`${row.time}-${index}`}
              className="grid gap-1 rounded border-2 p-3 sm:grid-cols-[70px_120px_1fr]"
            >
              <span className="font-mono text-xs">{row.time}</span>
              <strong>{row.actor}</strong>
              <span>
                {row.action} · <span className="text-muted-foreground">{row.reason}</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réconciliation</AlertDialogTitle>
            <AlertDialogDescription>
              Le retry réutilise la clé idempotente existante. Il ne doit produire ni double débit,
              ni double crédit. La raison sera auditée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Raison obligatoire…"
            aria-label="Raison de la réconciliation"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={!reason.trim()} onClick={reconcile}>
              Confirmer et auditer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border-2 bg-muted/20 p-3">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className={mono ? "font-mono text-xs" : ""}>{value}</strong>
    </div>
  );
}
function CheckLine({ label, ok }: { label: string; ok: boolean }) {
  const Icon = ok ? ShieldCheck : History;
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 pb-2">
      <span>{label}</span>
      <Icon className={ok ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
    </div>
  );
}
