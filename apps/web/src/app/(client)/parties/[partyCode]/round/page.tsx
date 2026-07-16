import { AppShell } from "@/components/ui/AppShell";
import { RoundPhaseView } from "@/components/round/RoundPhaseView";
import { notFound } from "next/navigation";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";

type PlayerRoundPageProps = {
  params: Promise<{ partyCode: string }>;
};

export default async function PlayerRoundPage({ params }: PlayerRoundPageProps) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Manche live"
      title="Briefing de la manche"
      subtitle="Votre interface joueur ne montre ni score provisoire ni état privé concurrent."
    >
      <PlayerJourneyNav party={party} current="round" />
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
