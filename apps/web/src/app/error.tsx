"use client";

import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid h-dvh place-items-center p-4"><PageState kind="error" title="Impossible d’afficher cette page" message="La demande n’a pas abouti. Réessayez sans perdre votre parcours." action={<Button onClick={reset}>Réessayer</Button>} /></main>;
}
