"use client";

import Link from "next/link";
import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  TicketCheck,
  Users,
  WalletCards,
} from "lucide-react";
import {
  cancelMyParticipation,
  getMyParticipation,
  isCancelledParticipation,
  isPaymentSettled,
  isRegisteredStatus,
  participationMutationInvalidateKeys,
  participationQueryKeys,
  registerForParty,
} from "@/services/participation/participationAdapter";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getPlayerJourneyState, nextPlayerHref } from "@/services/player/player-journey";
import {
  getPublicPartyByCode,
  sessionQueryKeys,
} from "@/services/session/sessionAdapter";
import type { PublicPartyDetail } from "@/services/session/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { Progress } from "@/components/ui/progress";

export function ParticipationPanel({ partyCode }: { partyCode: string }) {
  const code = decodeURIComponent(partyCode).toUpperCase();
  const queryClient = useQueryClient();
  const registerKeyRef = useRef<string | null>(null);

  const partyQuery = useQuery({
    queryKey: sessionQueryKeys.detail(code),
    queryFn: async () => {
      const result = await getPublicPartyByCode(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 20_000,
  });

  const mineQuery = useQuery({
    queryKey: participationQueryKeys.mine(code),
    queryFn: async () => {
      const result = await getMyParticipation(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 10_000,
    retry: false,
  });

  const invalidateAll = async () => {
    await Promise.all(
      participationMutationInvalidateKeys(code).map((key) =>
        queryClient.invalidateQueries({ queryKey: [...key] }),
      ),
    );
  };

  const registerMutation = useMutation({
    scope: { id: `participation-register-${code}` },
    mutationFn: async () => {
      // Stable key for double-click / retry of the same intent.
      registerKeyRef.current ??= `register-${code}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`;
      const result = await registerForParty(code, { idempotencyKey: registerKeyRef.current });
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    onSuccess: async () => {
      trackAnalyticsEvent("player.participation.registered", { partyCode: code });
      await invalidateAll();
    },
  });

  const cancelMutation = useMutation({
    scope: { id: `participation-cancel-${code}` },
    mutationFn: async () => {
      const result = await cancelMyParticipation(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    onSuccess: async () => {
      registerKeyRef.current = null;
      trackAnalyticsEvent("player.participation.cancelled", { partyCode: code });
      await invalidateAll();
    },
  });

  if (partyQuery.isLoading || mineQuery.isLoading) {
    return (
      <PageState
        kind="loading"
        title="Chargement de la participation"
        message="Vérification de la partie et de votre statut serveur…"
      />
    );
  }

  if (partyQuery.isError) {
    const errCode = (partyQuery.error as { code?: string }).code;
    const denied = errCode === "PARTY_NOT_FOUND" || errCode === "PARTY_INACCESSIBLE";
    return (
      <PageState
        kind={denied ? "denied" : "error"}
        title={denied ? "Partie inaccessible" : "Erreur de chargement"}
        message={
          partyQuery.error instanceof Error
            ? partyQuery.error.message
            : "Impossible de charger la partie."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/parties" />}>Catalogue</Button>
            <Button type="button" variant="outline" onClick={() => void partyQuery.refetch()}>
              <RefreshCw /> Réessayer
            </Button>
          </div>
        }
      />
    );
  }

  const party = partyQuery.data;
  if (!party) {
    return (
      <PageState
        kind="empty"
        title="Partie indisponible"
        message="Aucune donnée publique n’a été renvoyée pour ce code."
        action={<Button render={<Link href="/parties" />}>Catalogue</Button>}
      />
    );
  }

  const participation = mineQuery.data ?? null;
  const registered = isRegisteredStatus(participation?.status);
  const cancelled = isCancelledParticipation(participation);
  const paymentSettled = isPaymentSettled(participation);
  const capacity = Math.max(party.capacity, 0);
  const full = capacity > 0 && party.players >= capacity;
  const registrationOpen =
    party.serverStatus === "SCHEDULED" || party.serverStatus === "PREPARATION_OPEN";
  const busy = registerMutation.isPending || cancelMutation.isPending;
  const actionError =
    (registerMutation.error as Error | null)?.message ||
    (cancelMutation.error as Error | null)?.message ||
    (mineQuery.isError && (mineQuery.error as { code?: string }).code === "UNAUTHENTICATED"
      ? "Connectez-vous pour gérer votre inscription."
      : null);
  const journeyState = getPlayerJourneyState(party, participation);
  const nextHref = nextPlayerHref(party, participation);

  if (full && !registered) {
    return (
      <PageState
        kind="denied"
        title="Cette partie est complète"
        message="Aucune place ne peut être réservée. La capacité est décidée uniquement côté serveur."
        action={<Button render={<Link href="/parties" />}>Choisir une autre partie</Button>}
      />
    );
  }

  if (!registrationOpen && !registered) {
    return (
      <PageState
        kind="denied"
        title="Inscriptions fermées"
        message="Cette partie n’accepte plus de nouvelles inscriptions."
        action={<Button render={<Link href="/parties" />}>Retour au catalogue</Button>}
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
              {capacity > 0 ? `${Math.max(capacity - party.players, 0)} places restantes` : "Capacité ouverte"}
            </span>
          </div>
          <CardTitle>Confirmer votre inscription</CardTitle>
          <CardDescription>
            Une seule participation active par compte. Double clic ou retry partagent la même clé
            d’idempotence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CapacityBlock party={party} />
          <div className="grid gap-3 sm:grid-cols-3">
            <FlowFact icon={Users} label="Admission" value="Décidée serveur" />
            <FlowFact icon={WalletCards} label="Montant" value={party.entryFeeLabel} />
            <FlowFact icon={TicketCheck} label="Ticket" value="Personnel" />
          </div>
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <strong>Périmètre de cette étape</strong>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Inscription / annulation uniquement.</li>
              <li>Le paiement est un service séparé — non décidé ici.</li>
              <li>Readiness et admission live ne sont pas contrôlés par ce panneau.</li>
            </ul>
          </div>

          {registered ? (
            <PageState
              kind="success"
              title="Inscription confirmée"
              message={
                paymentSettled
                  ? `Statut serveur : ${participation?.status ?? "PAID"}. Votre accès joueur progresse vers ${journeyState === "preparation-ready" ? "la préparation" : "la suite de parcours"}.`
                  : `Statut serveur : ${participation?.status ?? "REGISTERED"}. Paiement requis avant lobby/live.`
              }
            />
          ) : null}

          {cancelled ? (
            <PageState
              kind="denied"
              title="Participation annulée"
              message={participation?.cancellationReason ?? "Votre place a été libérée. Vous pouvez réserver à nouveau si la capacité le permet."}
            />
          ) : null}

          {participation?.expiresAt ? (
            <p className="text-xs text-muted-foreground" role="status">
              Réservation valable jusqu’au {new Date(participation.expiresAt).toLocaleString("fr-FR", { timeZone: "UTC", timeZoneName: "short" })}.
            </p>
          ) : null}

          {actionError ? (
            <PageState kind="error" title="Action refusée" message={actionError} />
          ) : null}

          {!registered || cancelled ? (
            <Button
              className="w-full"
              size="lg"
              disabled={busy || full || !registrationOpen}
              onClick={() => {
                if (registerMutation.isPending) return;
                registerMutation.mutate();
              }}
            >
              <CheckCircle2 />
              {registerMutation.isPending ? "Confirmation…" : "Confirmer mon inscription"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                disabled={busy || paymentSettled}
                onClick={() => {
                  if (cancelMutation.isPending) return;
                  cancelMutation.mutate();
                }}
              >
                {cancelMutation.isPending ? "Annulation…" : "Annuler mon inscription"}
              </Button>
              <Button
                className="w-full"
                size="lg"
                render={<Link href={nextHref} />}
              >
                {paymentSettled ? "Continuer le parcours joueur" : "Continuer vers le paiement"} <ArrowRight />
              </Button>
            </div>
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
          <div>
            <span className="text-muted-foreground">Votre statut</span>
            <p className="font-semibold">{participation?.status ?? "Non inscrit"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Paiement</span>
            <p className="font-semibold">{participation?.paymentState ?? "Aucun"}</p>
          </div>
          <div className="flex gap-2 rounded-md border p-3 text-muted-foreground">
            <CircleAlert className="size-5 shrink-0" />
            <p>
              La réservation n’autorise pas l’accès live. Paiement, readiness et admission restent des
              décisions serveur hors de ce panneau.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={partyQuery.isFetching || mineQuery.isFetching}
            onClick={() => {
              void partyQuery.refetch();
              void mineQuery.refetch();
            }}
          >
            <RefreshCw /> Actualiser le statut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CapacityBlock({ party }: { party: PublicPartyDetail }) {
  const capacity = Math.max(party.capacity, 0);
  const progress = capacity > 0 ? Math.min(100, (party.players / capacity) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Capacité</span>
        <strong>
          {party.players}/{capacity || "—"}
        </strong>
      </div>
      <Progress value={progress} />
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
