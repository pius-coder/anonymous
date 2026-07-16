"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  TicketCheck,
  Users,
  WalletCards,
} from "lucide-react";
import type { UiParty } from "@/lib/ui-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { Progress } from "@/components/ui/progress";
import { isPartyFull } from "./player-data";

export function ParticipationPanel({ party }: { party: UiParty }) {
  const [status, setStatus] = useState<"available" | "pending" | "registered">("available");
  const full = isPartyFull(party);

  if (full) {
    return (
      <PageState
        kind="denied"
        title="Cette partie est complète"
        message="Aucune place ne peut être réservée et aucun débit ne sera effectué."
        action={<Button render={<Link href="/parties" />}>Choisir une autre partie</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">PARTICIPATION</Badge>
            <span className="text-sm text-muted-foreground">
              {party.capacity - party.players} places restantes
            </span>
          </div>
          <CardTitle>Confirmer votre inscription</CardTitle>
          <CardDescription>Une seule participation sera créée pour votre compte.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Capacité</span>
              <strong>
                {party.players}/{party.capacity}
              </strong>
            </div>
            <Progress value={(party.players / party.capacity) * 100} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FlowFact icon={Users} label="Admission" value="Ouverte" />
            <FlowFact icon={WalletCards} label="Montant" value={party.entryFee} />
            <FlowFact icon={TicketCheck} label="Ticket" value="Personnel" />
          </div>
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <strong>Conditions publiques</strong>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Être présent pendant la préparation.</li>
              <li>Confirmer le paiement avant l’admission.</li>
              <li>Respecter les règles publiques du mini-jeu.</li>
            </ul>
          </div>
          {status === "registered" ? (
            <PageState
              kind="success"
              title="Inscription confirmée"
              message="Votre place est réservée. Finalisez maintenant le paiement."
            />
          ) : null}
          {status !== "registered" ? (
            <Button
              className="w-full"
              size="lg"
              disabled={status === "pending"}
              onClick={() => {
                setStatus("pending");
                window.setTimeout(() => setStatus("registered"), 500);
              }}
            >
              <CheckCircle2 />
              {status === "pending" ? "Confirmation…" : "Confirmer mon inscription"}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              render={<Link href={`/parties/${party.code}/payment`} />}
            >
              Continuer vers le paiement <ArrowRight />
            </Button>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif</CardTitle>
          <CardDescription>{party.code}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <span className="text-muted-foreground">Partie</span>
            <p className="font-semibold">{party.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Départ</span>
            <p className="font-semibold">{party.startsAt}</p>
          </div>
          <div className="flex gap-2 rounded-md border p-3 text-muted-foreground">
            <CircleAlert className="size-5 shrink-0" />
            <p>
              La réservation n’autorise pas encore l’accès live. Le paiement et la préparation
              restent obligatoires.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FlowFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <Icon className="mb-3 size-5 text-primary" />
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
