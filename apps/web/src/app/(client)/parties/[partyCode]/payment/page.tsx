import { PaymentPanel } from "@/components/player/PaymentPanel";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { AppShell } from "@/components/ui/AppShell";

export default async function PaymentPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();
  return (
    <AppShell
      audience="Joueur"
      eyebrow={code}
      title="Finaliser le paiement"
      subtitle="Montant, moyen et statut restent visibles jusqu’à la confirmation."
    >
      <PlayerJourneyNav partyCode={code} current="payment" />
      <PaymentPanel partyCode={code} />
    </AppShell>
  );
}
