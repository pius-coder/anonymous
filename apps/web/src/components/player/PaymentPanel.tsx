"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import type { UiParty } from "@/lib/ui-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";

type Method = "mobile" | "card" | "wallet";
type Status = "idle" | "processing" | "confirmed";

export function PaymentPanel({ party }: { party: UiParty }) {
  const [method, setMethod] = useState<Method>("mobile");
  const [status, setStatus] = useState<Status>("idle");
  const methods = [
    {
      id: "mobile" as const,
      icon: Smartphone,
      label: "Mobile Money",
      detail: "Confirmation sur votre téléphone",
    },
    { id: "card" as const, icon: CreditCard, label: "Carte", detail: "Paiement sécurisé externe" },
    {
      id: "wallet" as const,
      icon: WalletCards,
      label: "Portefeuille",
      detail: "Solde disponible : 18 450 FCFA",
    },
  ];

  function pay() {
    setStatus("processing");
    window.setTimeout(() => setStatus("confirmed"), 700);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">PAIEMENT REQUIS</Badge>
            <strong>{party.entryFee}</strong>
          </div>
          <CardTitle>Choisissez un moyen de paiement</CardTitle>
          <CardDescription>
            Vous ne serez débité qu’une fois, après confirmation du prestataire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {methods.map(({ id, icon: Icon, label, detail }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMethod(id)}
                className={`flex items-center gap-4 rounded-md border p-4 text-left transition-colors ${method === id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                aria-pressed={method === id}
              >
                <span className="grid size-10 place-items-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </span>
                <span className="flex-1">
                  <strong className="block">{label}</strong>
                  <small className="text-muted-foreground">{detail}</small>
                </span>
                <span
                  className={`size-4 rounded-full border-4 ${method === id ? "border-primary" : "border-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          {status === "processing" ? (
            <PageState
              kind="loading"
              title="Paiement en cours"
              message="Nous attendons une confirmation. Ne relancez pas un second débit."
            />
          ) : null}
          {status === "confirmed" ? (
            <PageState
              kind="success"
              title="Paiement confirmé"
              message="Votre participation est débloquée et l’accès à la préparation est disponible."
            />
          ) : null}
          {status === "idle" ? (
            <Button className="w-full" size="lg" onClick={pay}>
              Payer {party.entryFee} <ArrowRight />
            </Button>
          ) : null}
          {status === "processing" ? (
            <Button className="w-full" variant="outline" onClick={() => setStatus("confirmed")}>
              <RefreshCw /> Vérifier le paiement
            </Button>
          ) : null}
          {status === "confirmed" ? (
            <Button
              className="w-full"
              size="lg"
              render={<Link href={`/parties/${party.code}/lobby`} />}
            >
              Accéder à la préparation <ArrowRight />
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
          <CardDescription>Participation {party.code}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between border-b pb-3 text-sm">
            <span>{party.name}</span>
            <strong>{party.entryFee}</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <strong className="text-lg">{party.entryFee}</strong>
          </div>
          <p className="flex gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0" />
            Aucune donnée sensible du prestataire n’est affichée ou conservée dans cette interface.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
