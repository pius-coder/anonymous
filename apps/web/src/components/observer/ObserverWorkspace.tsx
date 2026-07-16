"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, Clock3, Eye, RefreshCw, Trophy, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { Progress } from "@/components/ui/progress";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getObserverParty } from "./observer-data";

type ObserverParty = ReturnType<typeof getObserverParty>;

export function ObserverWorkspace({ party }: { party: ObserverParty }) {
  const [stale, setStale] = useState(false);
  const [lastSync, setLastSync] = useState<string>(party.updatedAt);

  function refreshSnapshot() {
    setStale(false);
    setLastSync(
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded border-2 bg-card p-3 shadow-md"
        aria-label="État du flux observateur"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ReadonlyBadge label="Observation publique" />
          <ConnectionStatus state={stale ? "stale" : "stable"} />
          <span className="text-xs text-muted-foreground">Dernière synchronisation {lastSync}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStale(true)}>
            <Clock3 /> Simuler stale
          </Button>
          <Button size="sm" onClick={refreshSnapshot}>
            <RefreshCw /> Rafraîchir
          </Button>
        </div>
      </section>

      {stale ? (
        <Alert status="warning">
          <RefreshCw />
          <AlertTitle>Snapshot obsolète</AlertTitle>
          <AlertDescription>
            Les données ci-dessous datent de {lastSync}. Elles ne sont pas présentées comme du
            direct.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="border-b-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{party.name}</CardTitle>
                <CardDescription>
                  {party.code} · {party.phase}
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Activity /> {party.roundStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <PublicMetric icon={Users} label="Participants" value="12 actifs" />
              <PublicMetric icon={Activity} label="Mini-jeu" value={party.minigame} />
              <PublicMetric icon={Trophy} label="Résultats" value="Non publiés" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression agrégée</span>
                <strong>{party.progress}%</strong>
              </div>
              <Progress
                value={party.progress}
                aria-label={`Progression globale ${party.progress}%`}
              />
            </div>
            <div className="grid min-h-64 place-items-center rounded border-2 border-dashed bg-muted/30 p-6 text-center">
              <div className="max-w-md space-y-2">
                <Eye className="mx-auto size-8 text-primary" />
                <h2 className="font-head text-lg">Projection filtrée</h2>
                <p className="text-sm text-muted-foreground">
                  Seuls les avatars, la progression agrégée et les événements publics sont transmis.
                  Aucun état privé du mini-jeu n’est exposé.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Événements publics</CardTitle>
            <CardDescription>Chronologie filtrée du flux.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {party.events.map((event) => (
              <div
                key={`${event.time}-${event.label}`}
                className="flex gap-3 border-l-2 border-primary pl-3"
              >
                <span className="font-mono text-xs text-muted-foreground">{event.time}</span>
                <span className="text-sm">{event.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="participants">Participants publics</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
        </TabsList>
        <TabsContent value="participants">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {party.participants.map((participant) => (
              <Card key={participant.label} size="sm">
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <strong>{participant.label}</strong>
                    <Badge variant="outline">{participant.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{participant.progress}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="publication">
          <Alert>
            <Trophy />
            <AlertTitle>Classement indisponible</AlertTitle>
            <AlertDescription>
              Les scores restent masqués jusqu’à publication explicite.{" "}
              <Link className="font-medium underline" href={`/observe/parties/${party.id}/results`}>
                Ouvrir la page des résultats publics
              </Link>
              .
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublicMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border-2 bg-muted/30 p-3">
      <Icon className="mb-2 size-4 text-primary" />
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
