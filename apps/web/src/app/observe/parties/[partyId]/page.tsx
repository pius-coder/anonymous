import { getObserverParty } from "@/components/observer/observer-data";
import { ObserverWorkspace } from "@/components/observer/ObserverWorkspace";
import { AppShell } from "@/components/ui/AppShell";

type ObserverPartyPageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function ObserverPartyPage({ params }: ObserverPartyPageProps) {
  const { partyId } = await params;
  const party = getObserverParty(decodeURIComponent(partyId));

  return (
    <AppShell
      audience="Observateur"
      eyebrow="Observation"
      title={party.name}
      subtitle="Vue lecture seule sans inputs, réponses cachées, scores provisoires ni données de paiement."
    >
      <ObserverWorkspace party={party} />
    </AppShell>
  );
}
