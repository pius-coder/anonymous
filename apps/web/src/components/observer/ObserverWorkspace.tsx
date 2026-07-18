"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, Clock3, Eye, RefreshCw, Trophy, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { PageState } from "@/components/ui/PageState";
import { Progress } from "@/components/ui/progress";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveAccessService, ScoringService } from "@/services/rpcServices";
import {
  observerPublishedResultsFromRpc,
  observerSnapshotFromRpc,
  type ObserverSnapshotView,
} from "./observer-view-model";

type ObserverConnectionState = "stable" | "stale" | "reconnecting" | "offline";

type ReadonlySnapshotRpcData = {
  snapshot?: {
    partyId?: { value?: string };
    currentPhase?: string;
    currentRoundNumber?: number;
    currentRoundStatus?: string;
    connectedCount?: number;
    participantCount?: number;
  };
};

type PublishedResultsRpcData = {
  finalScores?: Array<{
    playerId?: { value?: string };
    score?: number;
    rank?: number;
    eliminated?: boolean;
  }>;
  publishedAt?: { seconds: bigint; nanos: number };
};

export function ObserverWorkspace({ partyId }: { partyId: string }) {
  const [connection, setConnection] = useState<ObserverConnectionState>("stale");
  const [snapshot, setSnapshot] = useState<ObserverSnapshotView | null>(null);
  const [lastSync, setLastSync] = useState<string>("—");
  const [liveError, setLiveError] = useState<string | null>(null);
  const hasFallbackSnapshot = useRef(false);
  const hadReadonlyFailure = useRef(false);

  const snapshotQuery = useQuery({
    queryKey: ["observer", "readonly-snapshot", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await LiveAccessService.readonlySnapshot(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return observerSnapshotFromRpc((result.data as ReadonlySnapshotRpcData).snapshot, partyId);
    },
    refetchInterval: 4_000,
  });

  const publishedQuery = useQuery({
    queryKey: ["observer", "published-results", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await ScoringService.published(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return observerPublishedResultsFromRpc(result.data as PublishedResultsRpcData);
    },
    refetchInterval: 8_000,
  });

  useEffect(() => {
    if (!snapshotQuery.data) return;
    hasFallbackSnapshot.current = true;
    hadReadonlyFailure.current = false;
    setSnapshot(snapshotQuery.data);
    setLastSync(nowLabel());
    setConnection("stable");
    setLiveError(null);
  }, [snapshotQuery.data, snapshotQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!snapshotQuery.isError) return;
    hadReadonlyFailure.current = true;
    setConnection(hasFallbackSnapshot.current ? "stale" : "offline");
    setLiveError((snapshotQuery.error as Error).message);
  }, [snapshotQuery.error, snapshotQuery.errorUpdatedAt, snapshotQuery.isError]);

  useEffect(() => {
    if (!snapshot || !snapshotQuery.isFetching || !hadReadonlyFailure.current) return;
    setConnection("reconnecting");
  }, [snapshot, snapshotQuery.isFetching]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function handleOffline() {
      setConnection(hasFallbackSnapshot.current ? "stale" : "offline");
      setLiveError("Connexion réseau interrompue");
    }

    function handleOnline() {
      if (hasFallbackSnapshot.current) {
        setConnection("reconnecting");
      }
      void snapshotQuery.refetch();
      void publishedQuery.refetch();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [publishedQuery, snapshotQuery]);

  async function refreshSnapshot() {
    if (snapshot) {
      setConnection("reconnecting");
    }
    await Promise.all([snapshotQuery.refetch(), publishedQuery.refetch()]);
  }

  if (snapshotQuery.isLoading && !snapshot) {
    return (
      <PageState
        kind="loading"
        title="Chargement du snapshot observateur"
        message="Récupération de la projection publique autorisée."
      />
    );
  }

  if (snapshotQuery.isError && !snapshot) {
    return (
      <PageState
        kind="error"
        title="Snapshot observateur indisponible"
        message={(snapshotQuery.error as Error).message}
        action={
          <Button variant="outline" onClick={() => void refreshSnapshot()}>
            <RefreshCw /> Réessayer
          </Button>
        }
      />
    );
  }

  if (!snapshot) {
    return (
      <PageState
        kind="empty"
        title="Aucun état public disponible"
        message="Cette partie ne diffuse pas encore de projection observateur."
      />
    );
  }

  const publishedResults = publishedQuery.data;
  const stale = connection === "stale" || connection === "offline";
  const progressBase = snapshot.participantCount > 0
    ? Math.round((snapshot.connectedCount / snapshot.participantCount) * 100)
    : 0;
  const progress = publishedResults?.published ? 100 : progressBase;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <section
        className="flex flex-wrap items-center justify-between gap-3 rounded border-2 bg-card p-3 shadow-md"
        aria-label="État du flux observateur"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ReadonlyBadge label="Observation publique" />
          <ConnectionStatus state={connection} />
          <span className="text-xs text-muted-foreground">Dernière synchronisation {lastSync}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConnection("stale")}>
            <Clock3 /> Marquer stale
          </Button>
          <Button
            size="sm"
            onClick={() => void refreshSnapshot()}
            disabled={snapshotQuery.isFetching || publishedQuery.isFetching}
          >
            <RefreshCw />{" "}
            {snapshotQuery.isFetching || publishedQuery.isFetching ? "Actualisation…" : "Rafraîchir"}
          </Button>
        </div>
      </section>

      {stale ? (
        <Alert status="warning">
          <RefreshCw />
          <AlertTitle>Snapshot obsolète</AlertTitle>
          <AlertDescription>
            Les données ci-dessous datent de {lastSync}. Elles ne sont pas présentées comme du direct.
          </AlertDescription>
        </Alert>
      ) : null}
      {liveError ? (
        <Alert status="info">
          <Clock3 />
          <AlertTitle>Flux readonly dégradé</AlertTitle>
          <AlertDescription>{liveError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="border-b-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Observation publique</CardTitle>
                <CardDescription>
                  {snapshot.partyId} · {snapshot.currentPhase || "Projection readonly"}
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Activity /> {snapshot.currentRoundStatus || "READONLY"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {snapshot.publicSignals.map((signal) => (
                <PublicMetric
                  key={signal.label}
                  icon={signal.label.includes("Phase") ? Activity : Users}
                  label={signal.label}
                  value={signal.value}
                />
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression agrégée</span>
                <strong>{progress}%</strong>
              </div>
              <Progress value={progress} aria-label={`Progression globale ${progress}%`} />
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
          <CardHeader className="border-b-2">
            <CardTitle>Événements publics</CardTitle>
            <CardDescription>Chronologie filtrée du flux.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.events.map((event) => (
              <div
                key={`${event.code}-${event.label}`}
                className="flex gap-3 border-l-2 border-primary pl-3"
              >
                <span className="font-mono text-xs text-muted-foreground">{event.code}</span>
                <span className="text-sm">{event.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="participants">Participants publics</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
        </TabsList>
        <TabsContent value="participants">
          {snapshot.participants.length === 0 ? (
            <PageState
              kind="empty"
              title="Aucun participant visible"
              message="Le flux readonly ne publie encore aucune présence publique pour cette partie."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {snapshot.participants.map((participant) => (
                <Card key={participant.label} size="sm">
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <strong>{participant.label}</strong>
                      <Badge variant="outline">{participant.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      État public uniquement, sans score provisoire ni input compétitif.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="publication">
          {publishedResults?.published ? (
            <Alert status="success">
              <Trophy />
              <AlertTitle>Classement officiel disponible</AlertTitle>
              <AlertDescription>
                La publication a invalidé la vue readonly et le classement officiel est disponible.{" "}
                <Link className="font-medium underline" href={`/observe/parties/${snapshot.partyId}/results`}>
                  Ouvrir les résultats publics
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Trophy />
              <AlertTitle>Classement indisponible</AlertTitle>
              <AlertDescription>
                Les scores restent masqués jusqu’à publication explicite.{" "}
                <Link className="font-medium underline" href={`/observe/parties/${snapshot.partyId}/results`}>
                  Ouvrir la page des résultats publics
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function nowLabel() {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="font-head text-lg">{value}</div>
      </CardContent>
    </Card>
  );
}
