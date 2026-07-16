import { PartyCatalogue } from "@/components/party/PartyCatalogue";
import { PublicShell } from "@/components/public/PublicShell";
import { uiParties } from "@/lib/ui-data";

export default function PartiesPage() {
  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <header className="mb-8 max-w-3xl">
          <p className="app-eyebrow">Explorer</p>
          <h1 className="mt-2 font-head text-3xl font-bold sm:text-4xl">Choisissez votre prochaine partie</h1>
          <p className="mt-3 text-muted-foreground">Sessions publiques, places restantes et prix d’entrée visibles avant toute inscription.</p>
        </header>
        <PartyCatalogue parties={uiParties.filter((party) => party.status !== "review")} />
      </main>
    </PublicShell>
  );
}
