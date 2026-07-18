"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gamepad2,
  RefreshCw,
  TicketCheck,
} from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { getPlayerJourneyState, nextPlayerHref } from "@/services/player/player-journey";
import { listMyTickets } from "@/services/player/myTickets";

function stateLabel(state: ReturnType<typeof getPlayerJourneyState>) {
  switch (state) {
    case "payment-required":
      return "Paiement requis";
    case "preparation-ready":
      return "Préparation";
    case "live-ready":
      return "Live";
    case "results":
      return "Résultats";
    case "cancelled":
      return "Annulé";
    default:
      return "Inscrit";
  }
}

function actionLabel(state: ReturnType<typeof getPlayerJourneyState>) {
  switch (state) {
    case "payment-required":
      return "Finaliser le paiement";
    case "preparation-ready":
      return "Ouvrir la préparation";
    case "live-ready":
      return "Entrer dans la room";
    case "results":
      return "Voir les résultats";
    case "cancelled":
      return "Réserver à nouveau";
    default:
      return "Voir le ticket";
  }
}

export default function TicketsPage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const ticketsQuery = useQuery({
    queryKey: ["me", "tickets"],
    queryFn: async () => {
      const result = await listMyTickets();
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 15_000,
    retry: 1,
  });

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Mes inscriptions"
      title="Tickets et accès"
      subtitle="Chaque ticket reflète l’état réel du serveur, le prix autoritaire et la prochaine action."
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => void ticketsQuery.refetch()}
          disabled={ticketsQuery.isFetching}
        >
          <RefreshCw className={ticketsQuery.isFetching ? "animate-spin" : undefined} />
          Actualiser
        </Button>
      }
    >
      <div className="space-y-4">
        {!isOnline ? (
          <p className="text-sm text-muted-foreground" role="status">
            Hors ligne : les derniers tickets connus restent visibles jusqu’au retour du réseau.
          </p>
        ) : null}
        {ticketsQuery.isStale && !ticketsQuery.isFetching ? (
          <p className="text-sm text-amber-700" role="status">
            Données potentiellement obsolètes. Lancez une actualisation pour vérifier vos accès.
          </p>
        ) : null}

        {ticketsQuery.isLoading ? (
          <PageState
            kind="loading"
            title="Chargement des tickets"
            message="Lecture de vos inscriptions et de leurs états serveur…"
          />
        ) : null}

        {ticketsQuery.isError ? (
          <PageState
            kind={(ticketsQuery.error as { code?: string }).code === "UNAUTHENTICATED" ? "denied" : "error"}
            title={(ticketsQuery.error as { code?: string }).code === "UNAUTHENTICATED" ? "Connexion requise" : "Tickets indisponibles"}
            message={
              ticketsQuery.error instanceof Error
                ? ticketsQuery.error.message
                : "Impossible de charger vos tickets."
            }
            action={
              <div className="flex flex-wrap gap-2">
                <Button render={<Link href="/auth/login" />}>Se connecter</Button>
                <Button type="button" variant="outline" onClick={() => void ticketsQuery.refetch()}>
                  <RefreshCw /> Réessayer
                </Button>
              </div>
            }
          />
        ) : null}

        {!ticketsQuery.isLoading && !ticketsQuery.isError && ticketsQuery.data?.length === 0 ? (
          <PageState
            kind="empty"
            title="Aucun ticket"
            message="Vous n’avez encore aucune participation active ou historique."
            action={<Button render={<Link href="/parties" />}>Parcourir le catalogue</Button>}
          />
        ) : null}

        {!ticketsQuery.isLoading && !ticketsQuery.isError && (ticketsQuery.data?.length ?? 0) > 0 ? (
          <div className="ticket-grid">
            {ticketsQuery.data!.map((ticket) => {
              const journeyState = getPlayerJourneyState(ticket.party, ticket);
              const href = nextPlayerHref(ticket.party, ticket);

              return (
                <Card key={ticket.id} className="ticket-card">
                  <CardHeader>
                    <div className="party-card-topline">
                      <Badge variant={journeyState === "payment-required" ? "secondary" : "default"}>
                        {stateLabel(journeyState)}
                      </Badge>
                      <TicketCheck />
                    </div>
                    <CardTitle>{ticket.party.name}</CardTitle>
                    <CardDescription>
                      {ticket.party.code} · config v{ticket.party.configVersion} · fee v{ticket.party.feeVersion}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="ticket-info">
                    <div>
                      <CalendarClock />
                      <span>
                        <small>Départ</small>
                        <strong>{ticket.party.startsAt}</strong>
                      </span>
                    </div>
                    <div>
                      <Gamepad2 />
                      <span>
                        <small>Mini-jeu</small>
                        <strong>{ticket.party.game}</strong>
                      </span>
                    </div>
                    <div>
                      <CheckCircle2 />
                      <span>
                        <small>Paiement</small>
                        <strong>{ticket.paymentState === "PAID" ? "Confirmé" : "En attente"}</strong>
                      </span>
                    </div>
                    <div>
                      <TicketCheck />
                      <span>
                        <small>Tarif</small>
                        <strong>{ticket.party.entryFeeLabel}</strong>
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      render={<Link href={href} />}
                      className="w-full"
                      variant={journeyState === "live-ready" ? "default" : "secondary"}
                    >
                      {actionLabel(journeyState)}
                      <ArrowRight />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
