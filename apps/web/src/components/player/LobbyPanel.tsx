"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Clock3,
  LogOut,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { LifecycleBanner } from "@/components/ui/LifecycleBanner";
import { PageState } from "@/components/ui/PageState";
import {
  isCancelledParticipation,
} from "@/services/participation/participationAdapter";
import { nextPlayerHref } from "@/services/player/player-journey";
import { usePlayerPartyAccess } from "@/services/player/usePlayerPartyAccess";
import {
  getPlayerPreparation,
  leavePreparation,
  markPresent,
  markReady,
  type PreparationState,
} from "@/services/preparationClient";

const STALE_MS = 15_000;

function readinessOf(state: PreparationState | undefined, userIdHint?: string) {
  if (!state) return { present: false, ready: false, status: "unknown" as const };
  // Prefer self row when user id unknown — UI may not have session id; use first matching READY/PRESENT aggregate for current user via last mutation.
  const self = userIdHint ? state.participants.find((p) => p.userId === userIdHint) : undefined;
  if (self) {
    return {
      present: self.status === "PRESENT" || self.status === "READY",
      ready: self.status === "READY",
      status: self.status,
    };
  }
  return { present: false, ready: false, status: "unknown" as const };
}

export function LobbyPanel({ partyCode }: { partyCode: string }) {
  const access = usePlayerPartyAccess(partyCode);
  const queryClient = useQueryClient();
  const queryKey = ["preparation", "player", access.code] as const;
  const party = access.party;
  const participation = access.participation;
  const journeyState = access.journeyState;
  const canLoadPreparation =
    journeyState === "preparation-ready" || journeyState === "live-ready";

  const prepQuery = useQuery({
    queryKey,
    enabled: canLoadPreparation,
    queryFn: async () => {
      const res = await getPlayerPreparation(access.code);
      if (!res.success) {
        const err = new Error(res.error.message) as Error & { code?: string };
        err.code = res.error.code;
        throw err;
      }
      return res.data;
    },
    refetchInterval: 8_000,
    staleTime: STALE_MS,
    retry: 1,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const presentMutation = useMutation({
    mutationFn: async () => {
      const res = await markPresent(access.code);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: invalidate,
  });

  const readyMutation = useMutation({
    mutationFn: async () => {
      const res = await markReady(access.code);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: invalidate,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const res = await leavePreparation(access.code);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: invalidate,
  });

  const submitting =
    presentMutation.isPending || readyMutation.isPending || leaveMutation.isPending;

  const selfStatus = (() => {
    if (readyMutation.data?.status === "READY")
      return { present: true, ready: true, status: "READY" };
    if (presentMutation.data?.status === "PRESENT") {
      return { present: true, ready: false, status: "PRESENT" };
    }
    if (presentMutation.data?.status === "READY") {
      return { present: true, ready: true, status: "READY" };
    }
    return readinessOf(prepQuery.data, prepQuery.data?.selfUserId);
  })();

  const present = selfStatus.present;
  const ready = selfStatus.ready;
  const canEnter = present && ready;
  const latestAnnouncement = prepQuery.data?.announcements[0];
  const isStale = prepQuery.isFetched && prepQuery.isStale && !prepQuery.isFetching;

  if (access.partyQuery.isLoading || access.participationQuery.isLoading) {
    return (
      <PageState
        kind="loading"
        title="Chargement de la préparation"
        message="Vérification de la partie, de votre ticket et du paiement serveur…"
      />
    );
  }

  if (access.partyQuery.isError) {
    return (
      <PageState
        kind="error"
        title="Préparation indisponible"
        message={
          access.partyQuery.error instanceof Error
            ? access.partyQuery.error.message
            : "Impossible de charger la partie."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/parties" />}>Catalogue</Button>
            <Button type="button" variant="outline" onClick={() => void access.partyQuery.refetch()}>
              <RefreshCw /> Réessayer
            </Button>
          </div>
        }
      />
    );
  }

  if (access.participationQuery.isError) {
    const code = (access.participationQuery.error as { code?: string }).code;
    return (
      <PageState
        kind={code === "UNAUTHENTICATED" ? "denied" : "error"}
        title={code === "UNAUTHENTICATED" ? "Connexion requise" : "Préparation indisponible"}
        message={
          access.participationQuery.error instanceof Error
            ? access.participationQuery.error.message
            : "Impossible de charger votre ticket."
        }
        action={
          <Button render={<Link href={`/parties/${access.code}/participation`} />}>
            Voir mon inscription
          </Button>
        }
      />
    );
  }

  if (!party || !participation || isCancelledParticipation(participation)) {
    return (
      <PageState
        kind="denied"
        title="Participation active requise"
        message="Vous devez conserver une participation active pour ouvrir la préparation."
        action={
          <Button render={<Link href={`/parties/${access.code}/participation`} />}>
            Ouvrir l’inscription
          </Button>
        }
      />
    );
  }

  if (journeyState === "payment-required") {
    return (
      <PageState
        kind="denied"
        title="Paiement requis"
        message="Le lobby reste verrouillé tant que votre ticket n’est pas réglé côté serveur."
        action={<Button render={<Link href={`/parties/${access.code}/payment`} />}>Finaliser le paiement</Button>}
      />
    );
  }

  if (!canLoadPreparation) {
    return (
      <PageState
        kind="denied"
        title="Préparation indisponible"
        message="Cette étape n’est pas ouverte pour votre statut actuel."
        action={
          <Button render={<Link href={nextPlayerHref(party, participation)} />}>
            Reprendre le parcours
          </Button>
        }
      />
    );
  }

  if (prepQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <LifecycleBanner status="LOADING" detail="Chargement de la préparation…" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Synchronisation du lobby…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (prepQuery.isError) {
    const message =
      prepQuery.error instanceof Error
        ? prepQuery.error.message
        : "Impossible de charger la préparation";
    return (
      <div className="space-y-4" role="alert">
        <LifecycleBanner
          status="ERROR"
          detail={message}
          meta={<ConnectionStatus state="offline" />}
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <WifiOff className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button
              type="button"
              onClick={() => prepQuery.refetch()}
              disabled={prepQuery.isFetching}
            >
              <RefreshCw className={prepQuery.isFetching ? "animate-spin" : undefined} />
              Réessayer / reconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const state = prepQuery.data;
  const emptyParticipants = !state?.participants.length;

  return (
    <div className="space-y-4">
      <LifecycleBanner
        status={state?.status ?? "PREPARATION_OPEN"}
        detail="La préparation est ouverte. Le démarrage restera une décision manuelle de l’administrateur."
        meta={
          <ConnectionStatus
            state={prepQuery.isFetching ? "reconnecting" : isStale ? "stale" : "stable"}
          />
        }
      />
      {isStale ? (
        <p className="flex items-center gap-2 text-xs text-amber-600" role="status">
          <Clock3 className="size-3.5" />
          Données potentiellement obsolètes — actualisation en cours ou manuelle.
          <Button type="button" size="sm" variant="outline" onClick={() => prepQuery.refetch()}>
            Actualiser
          </Button>
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="size-5" />
                <Badge>Annonce</Badge>
              </div>
              {latestAnnouncement ? (
                <>
                  <CardTitle>{latestAnnouncement.title}</CardTitle>
                  <CardDescription>{latestAnnouncement.body}</CardDescription>
                </>
              ) : (
                <>
                  <CardTitle>Aucune annonce pour l’instant</CardTitle>
                  <CardDescription>
                    Les annonces d’avant-match apparaîtront ici. Elles ne démarrent jamais la
                    partie.
                  </CardDescription>
                </>
              )}
            </CardHeader>
            {latestAnnouncement ? (
              <CardContent className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Publié par l’équipe de session</span>
                <time dateTime={latestAnnouncement.createdAt}>
                  {new Date(latestAnnouncement.createdAt).toLocaleString()}
                </time>
              </CardContent>
            ) : null}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mon statut</CardTitle>
              <CardDescription>
                Présence et état prêt sont deux confirmations distinctes et idempotentes.
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
              <StatusTile
                icon={ShieldCheck}
                label="Lobby"
                value={emptyParticipants ? "Vide" : `${state?.stats.ready ?? 0} prêts`}
                done={!emptyParticipants}
              />
            </CardContent>
          </Card>
          {emptyParticipants ? (
            <p className="text-sm text-muted-foreground" role="status">
              Aucun autre participant visible pour l’instant.
            </p>
          ) : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Prochaine action</CardTitle>
            <CardDescription>Horaire communiqué par l’équipe de session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(presentMutation.isError || readyMutation.isError || leaveMutation.isError) && (
              <p className="text-sm text-rose-600" role="alert">
                {(presentMutation.error || readyMutation.error || leaveMutation.error)?.message ??
                  "Action refusée"}
              </p>
            )}
            <Button
              className="w-full"
              variant={present ? "outline" : "default"}
              onClick={() => presentMutation.mutate()}
              disabled={present || submitting}
              aria-busy={presentMutation.isPending}
            >
              <UserCheck />
              {presentMutation.isPending
                ? "Envoi…"
                : present
                  ? "Présence confirmée"
                  : "Je suis présent"}
            </Button>
            <Button
              className="w-full"
              variant={ready ? "outline" : "secondary"}
              onClick={() => readyMutation.mutate()}
              disabled={!present || ready || submitting}
              aria-busy={readyMutation.isPending}
            >
              <Check />
              {readyMutation.isPending ? "Envoi…" : ready ? "Vous êtes prêt" : "Je suis prêt"}
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => leaveMutation.mutate()}
              disabled={submitting || (!present && !ready)}
              aria-busy={leaveMutation.isPending}
            >
              <LogOut />
              {leaveMutation.isPending ? "Déconnexion…" : "Quitter le lobby"}
            </Button>
            <Button
              className="w-full"
              size="lg"
              disabled={!canEnter}
              render={canEnter ? <Link href={`/parties/${access.code}/room`} /> : undefined}
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
                Présence et prêt confirmés côté serveur.
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
