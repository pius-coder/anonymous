"use client";

export default function SessionDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 py-20 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-3xl font-black uppercase">Session introuvable</h1>
        <p className="max-w-md text-muted-foreground">{error.message || "Impossible de charger les détails de la session."}</p>
        <button
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center rounded-md border-2 border-border bg-background px-6 text-sm font-medium hover:bg-accent"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
