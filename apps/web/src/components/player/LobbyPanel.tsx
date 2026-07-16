"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Clock3, Megaphone, ShieldCheck, UserCheck, Wifi } from "lucide-react";
import type { UiParty } from "@/lib/ui-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { LifecycleBanner } from "@/components/ui/LifecycleBanner";

export function LobbyPanel({ party }: { party: UiParty }) {
  const [present, setPresent] = useState(false);
  const [ready, setReady] = useState(false);
  const canEnter = present && ready;
  return (
    <div className="space-y-4">
      <LifecycleBanner
        status="PREPARATION_OPEN"
        detail="La préparation est ouverte. Le démarrage restera une décision manuelle de l’administrateur."
        meta={<ConnectionStatus state="stable" />}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="size-5" />
                <Badge>Annonce</Badge>
              </div>
              <CardTitle>Bienvenue dans la préparation</CardTitle>
              <CardDescription>
                Le briefing ouvrira quelques minutes avant la manche. Vérifiez votre présence et
                votre disponibilité.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Publié par l’équipe de session</span>
              <span>Il y a 2 min</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mon statut</CardTitle>
              <CardDescription>
                Présence et état prêt sont deux confirmations distinctes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <StatusTile
                icon={UserCheck}
                label="Présence"
                value={present ? "Confirmée" : "À confirmer"}
                done={present}
              />
              <StatusTile icon={Check} label="Prêt" value={ready ? "Oui" : "Non"} done={ready} />
              <StatusTile icon={ShieldCheck} label="Admission" value="Autorisée" done />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Prochaine action</CardTitle>
            <CardDescription>{party.startsAt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant={present ? "outline" : "default"}
              onClick={() => setPresent(true)}
              disabled={present}
            >
              <UserCheck />
              {present ? "Présence confirmée" : "Je suis présent"}
            </Button>
            <Button
              className="w-full"
              variant={ready ? "outline" : "secondary"}
              onClick={() => setReady(true)}
              disabled={!present || ready}
            >
              <Check />
              {ready ? "Vous êtes prêt" : "Je suis prêt"}
            </Button>
            <Button
              className="w-full"
              size="lg"
              disabled={!canEnter}
              render={canEnter ? <Link href={`/parties/${party.code}/room`} /> : undefined}
            >
              Entrer dans la room <ArrowRight />
            </Button>
            {!canEnter ? (
              <p className="flex gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4 shrink-0" />
                Confirmez d’abord votre présence puis votre état prêt.
              </p>
            ) : (
              <p className="flex gap-2 text-sm text-emerald-700">
                <Wifi className="size-4 shrink-0" />
                Votre place live est prête à être réservée.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  done,
}: {
  icon: typeof Check;
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className={`rounded-md border p-4 ${done ? "bg-emerald-500/5" : "bg-muted/40"}`}>
      <Icon className={`mb-4 size-5 ${done ? "text-emerald-600" : "text-muted-foreground"}`} />
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
