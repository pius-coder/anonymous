import { AppShell } from "@/components/ui/AppShell";
import { ResultsView } from "@/components/party/ResultsView";
import { notFound } from "next/navigation";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";

export default async function ResultsPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();
  return (
    <AppShell
      audience="Joueur"
      eyebrow={party.code}
      title="Résultats officiels"
      subtitle="Classement visible uniquement après la publication explicite des scores."
    >
      <PlayerJourneyNav party={party} current="results" />
      <ResultsView />
    </AppShell>
  );
}
