"use client";

import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/PageState";

export default function ObserverPartyError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="grid min-h-0 flex-1 place-items-center">
      <PageState
        kind="error"
        title="Flux observateur indisponible"
        message={error.message}
        action={
          <Button variant="outline" onClick={reset}>
            Réessayer
          </Button>
        }
      />
    </main>
  );
}
