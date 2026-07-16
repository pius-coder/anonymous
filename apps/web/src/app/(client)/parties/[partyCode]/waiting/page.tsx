import { RoundPhaseView } from "@/components/round/RoundPhaseView";
import { AppShell } from "@/components/ui/AppShell";
import { notFound } from "next/navigation";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";
import { PlayerWaitingPanel } from "@/components/party/PlayerWaitingPanel";

type PlayerWaitingPageProps = {
  params: Promise<{ partyCode: string }>;
};

export default async function PlayerWaitingPage({ params }: PlayerWaitingPageProps) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Vérification"
      title="Résultats en cours de vérification"
      subtitle="Les résultats restent privés jusqu'à la publication explicite de l'administrateur."
    >
      <PlayerJourneyNav party={party} current="round" />
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
