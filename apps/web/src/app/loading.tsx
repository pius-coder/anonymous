import { PageState } from "@/components/ui/PageState";

export default function Loading() {
  return <main className="grid h-dvh place-items-center p-4"><PageState kind="loading" title="Chargement" message="Préparation de votre espace Noya." /></main>;
}
