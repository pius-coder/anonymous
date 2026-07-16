import { notFound } from "next/navigation";
import { PaymentPanel } from "@/components/player/PaymentPanel";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";
import { AppShell } from "@/components/ui/AppShell";

export default async function PaymentPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();
  return (
    <AppShell
      audience="Joueur"
      eyebrow={party.code}
      title="Finaliser le paiement"
      subtitle="Montant, moyen et statut restent visibles jusqu’à la confirmation."
    >
      <PlayerJourneyNav party={party} current="payment" />
      <PaymentPanel party={party} />
    </AppShell>
  );
}
