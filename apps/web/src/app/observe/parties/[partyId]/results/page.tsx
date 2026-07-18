import { ObserverResults } from "@/components/observer/ObserverResults";
import { AppShell } from "@/components/ui/AppShell";

export default async function ObserverResultsPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  return (
    <AppShell
      audience="Observateur"
      eyebrow="Publication officielle"
      title="Résultats publics"
      subtitle="Seule la version publiée est accessible à l’audience observateur."
    >
      <ObserverResults partyId={decodeURIComponent(partyId)} />
    </AppShell>
  );
}
