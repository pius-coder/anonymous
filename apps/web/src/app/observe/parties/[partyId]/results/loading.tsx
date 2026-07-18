import { PageState } from "@/components/ui/PageState";

export default function ObserverResultsLoading() {
  return (
    <main className="grid min-h-0 flex-1 place-items-center">
      <PageState
        kind="loading"
        title="Chargement des résultats publics"
        message="Vérification de la publication officielle."
      />
    </main>
  );
}
