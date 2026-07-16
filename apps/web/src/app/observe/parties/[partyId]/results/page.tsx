import { getObserverParty } from "@/components/observer/observer-data";
import { ObserverResults } from "@/components/observer/ObserverResults";
import { AppShell } from "@/components/ui/AppShell";

export default async function ObserverResultsPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const party = getObserverParty(decodeURIComponent(partyId));
  return (
    <AppShell
      audience="Observateur"
      eyebrow="Publication officielle"
      title="Résultats publics"
      subtitle="Seule la version publiée est accessible à l’audience observateur."
    >
      <ObserverResults party={party} />
    </AppShell>
  );
}
