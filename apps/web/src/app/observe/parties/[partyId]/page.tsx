import { ReadonlyRoundSnapshot } from "@/components/observer/ReadonlyRoundSnapshot";
import { AppShell } from "@/components/ui/AppShell";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

type ObserverPartyPageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function ObserverPartyPage({ params }: ObserverPartyPageProps) {
  const { partyId } = await params;

  return (
    <AppShell
      audience="Observateur"
      eyebrow="Observation"
      title="Projection publique de la manche"
      subtitle="Vue lecture seule sans inputs, réponses cachées, scores provisoires ni données de paiement."
      actions={<ConnectionStatus state="stable" />}
    >
      <ReadonlyRoundSnapshot
        partyId={decodeURIComponent(partyId)}
        roundStatus="ROUND_ACTIVE"
        currentRoundNumber={1}
        minigameName="Mémoire mystique"
        publicSignals={[
          { label: "Participants actifs", value: "12" },
          { label: "Round", value: "En cours" },
          { label: "Publication score", value: "Aucune" },
        ]}
        participants={[
          { label: "Joueur 1", status: "Actif" },
          { label: "Joueur 2", status: "Termine" },
        ]}
      />
    </AppShell>
  );
}
