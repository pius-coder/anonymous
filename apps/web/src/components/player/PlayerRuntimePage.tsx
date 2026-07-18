"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { RoomExperience } from "@/components/game/RoomExperience";
import { PlayerResultsPanel } from "@/components/party/PlayerResultsPanel";
import { PlayerWaitingPanel } from "@/components/party/PlayerWaitingPanel";
import { RoundPhaseView } from "@/components/round/RoundPhaseView";
import { isCancelledParticipation } from "@/services/participation/participationAdapter";
import {
  nextPlayerHref,
  type PlayerJourneyState,
} from "@/services/player/player-journey";
import { usePlayerPartyAccess } from "@/services/player/usePlayerPartyAccess";

type RuntimeMode = "room" | "round" | "waiting" | "results";

const ALLOWED_STATES: Record<RuntimeMode, readonly PlayerJourneyState[]> = {
  room: ["live-ready"],
  round: ["live-ready"],
  waiting: ["live-ready", "results"],
  results: ["live-ready", "results"],
};

function resumeLabel(state: PlayerJourneyState | null): string {
  switch (state) {
    case "payment-required":
      return "Finaliser le paiement";
    case "preparation-ready":
      return "Ouvrir la préparation";
    case "live-ready":
      return "Entrer dans la room";
    case "results":
      return "Voir les résultats";
    default:
      return "Reprendre le parcours";
  }
}

export function PlayerRuntimePage({
  partyCode,
  mode,
}: {
  partyCode: string;
  mode: RuntimeMode;
}) {
  const access = usePlayerPartyAccess(partyCode);
  const party = access.party;
  const participation = access.participation;
  const journeyState = access.journeyState;

  if (access.partyQuery.isLoading || access.participationQuery.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-xl">
          <PageState
            kind="loading"
            title="Chargement du parcours joueur"
            message="Vérification de la partie, de votre ticket et des autorisations serveur…"
          />
        </div>
      </main>
    );
  }

  if (access.partyQuery.isError) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-xl">
          <PageState
            kind="error"
            title="Partie indisponible"
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
        </div>
      </main>
    );
  }

  if (access.participationQuery.isError) {
    const code = (access.participationQuery.error as { code?: string }).code;
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-xl">
          <PageState
            kind={code === "UNAUTHENTICATED" ? "denied" : "error"}
            title={code === "UNAUTHENTICATED" ? "Connexion requise" : "Accès indisponible"}
            message={
              access.participationQuery.error instanceof Error
                ? access.participationQuery.error.message
                : "Impossible de charger votre participation."
            }
            action={
              <Button render={<Link href={`/parties/${access.code}/participation`} />}>
                Voir mon inscription
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  if (!party || !participation || isCancelledParticipation(participation)) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-xl">
          <PageState
            kind="denied"
            title="Participation active requise"
            message="Vous devez disposer d’un ticket actif pour poursuivre ce parcours."
            action={
              <Button render={<Link href={`/parties/${access.code}/participation`} />}>
                Ouvrir l’inscription
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  if (!journeyState || !ALLOWED_STATES[mode].includes(journeyState)) {
    const href = nextPlayerHref(party, participation);
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-xl">
          <PageState
            kind="denied"
            title={journeyState === "payment-required" ? "Paiement requis" : "Accès refusé"}
            message={
              journeyState === "payment-required"
                ? "Le lobby et le live restent verrouillés tant que le paiement n’est pas confirmé."
                : "Cette étape n’est pas ouverte pour votre statut actuel."
            }
            action={
              <Button render={<Link href={href} />}>
                {resumeLabel(journeyState)} <ArrowRight />
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  if (mode === "room") {
    return (
      <RoomExperience
        party={{ id: party.id, code: party.code, name: party.name, game: party.game }}
      />
    );
  }

  if (mode === "round") {
    return (
      <AppShell
        audience="Joueur"
        eyebrow="Manche live"
        title="Briefing de la manche"
        subtitle="Votre interface joueur ne montre ni score provisoire ni état privé concurrent."
      >
        <PlayerJourneyNav partyCode={access.code} current="round" />
        <RoundPhaseView
          partyCode={party.code}
          roundNumber={1}
          minigameName={party.game}
          phase="briefing"
          connection="stable"
          deadlineLabel="Briefing · 01:48"
          rules={[
            "Mémorisez la séquence affichée",
            "Une seule réponse est acceptée par tour",
            "Attendez le signal serveur avant toute action",
          ]}
        />
      </AppShell>
    );
  }

  if (mode === "waiting") {
    return (
      <AppShell
        audience="Joueur"
        eyebrow="Vérification"
        title="Résultats en cours de vérification"
        subtitle="Les résultats restent privés jusqu’à la publication explicite de l’administrateur."
      >
        <PlayerJourneyNav partyCode={access.code} current="round" />
        <RoundPhaseView
          partyCode={party.code}
          roundNumber={1}
          minigameName={party.game}
          phase="finished"
          connection="stable"
          deadlineLabel="Manche fermée"
        />
        <PlayerWaitingPanel partyId={party.id} partyCode={party.code} />
      </AppShell>
    );
  }

  return (
    <AppShell
      audience="Joueur"
      eyebrow={party.code}
      title="Résultats officiels"
      subtitle="Classement visible uniquement après la publication explicite des scores."
    >
      <PlayerJourneyNav partyCode={access.code} current="results" />
      <PlayerResultsPanel
        partyId={party.id}
        partyCode={party.code}
        preferWaiting={journeyState !== "results"}
      />
    </AppShell>
  );
}
