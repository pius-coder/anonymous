import { AppShell } from "@/components/ui/AppShell";
import { PartyCatalogue } from "@/components/party/PartyCatalogue";
import { uiParties } from "@/lib/ui-data";

export default function PartiesPage() {
  return (
    <AppShell
      audience="Joueur"
      eyebrow="Explorer"
      title="Choisissez votre prochaine partie"
      subtitle="Sessions publiques, places restantes et prix d’entrée visibles avant toute inscription."
    >
      <PartyCatalogue parties={uiParties.filter((party) => party.status !== "review")} />
    </AppShell>
  );
}
