import { notFound } from "next/navigation";
import { LobbyPanel } from "@/components/player/LobbyPanel";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";
import { AppShell } from "@/components/ui/AppShell";

export default async function LobbyPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();
  return (
    <AppShell
      audience="Joueur"
      eyebrow={party.code}
      title="Préparation de la partie"
      subtitle="Confirmez votre présence puis votre état prêt avant l’accès live."
    >
      <PlayerJourneyNav party={party} current="lobby" />
      <LobbyPanel party={party} />
    </AppShell>
  );
}
