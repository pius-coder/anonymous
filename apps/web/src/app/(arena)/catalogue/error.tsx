"use client";

import { Button } from "@/components/retroui/button";

export default function CatalogueError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">⚠️</p>
      <h2 className="font-head text-xl font-black uppercase">Erreur catalogue</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>Réessayer</Button>
    </div>
  );
}
