import { LobbyPanel } from "@/components/player/LobbyPanel";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { AppShell } from "@/components/ui/AppShell";

export default async function LobbyPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();

  return (
    <AppShell
      audience="Joueur"
      eyebrow={code}
      title="Préparation de la partie"
      subtitle="Confirmez votre présence puis votre état prêt avant l’accès live."
    >
      <PlayerJourneyNav partyCode={code} current="lobby" />
      <LobbyPanel partyCode={code} />
    </AppShell>
  );
}
