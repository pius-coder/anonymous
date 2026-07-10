"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-2xl font-black uppercase">Erreur administration</h1>
        <p className="text-sm text-muted-foreground">{error.message || "Une erreur inattendue s'est produite."}</p>
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
