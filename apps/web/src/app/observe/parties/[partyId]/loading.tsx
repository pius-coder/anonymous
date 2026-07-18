import { PageState } from "@/components/ui/PageState";

export default function ObserverPartyLoading() {
  return (
    <main className="grid min-h-0 flex-1 place-items-center">
      <PageState
        kind="loading"
        title="Chargement du flux observateur"
        message="Connexion au snapshot public de la partie."
      />
    </main>
  );
}
