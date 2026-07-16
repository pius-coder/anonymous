import { notFound } from "next/navigation";
import { ParticipationPanel } from "@/components/player/ParticipationPanel";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";
import { AppShell } from "@/components/ui/AppShell";

export default async function ParticipationPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();
  return (
    <AppShell
      audience="Joueur"
      eyebrow={party.code}
      title="Votre participation"
      subtitle="Réservez une place personnelle avant de passer au paiement."
    >
      <PlayerJourneyNav party={party} current="participation" />
      <ParticipationPanel party={party} />
    </AppShell>
  );
}
