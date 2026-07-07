import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import SessionCard from "@/components/SessionCard";

export const metadata: Metadata = {
  title: "Catalogue des Sessions | Session Jeu",
  description:
    "Découvrez les sessions de compétitions stratégiques disponibles. Inscrivez-vous et participez.",
};

async function getSessions(page = 1, limit = 20) {
  const apiBase = process.env.API_URL || "http://localhost:3001";
  const res = await fetch(`${apiBase}/v1/public/sessions?page=${page}&limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
  return res.json();
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;
  const result = await getSessions(page);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/">
            <h1 className="text-xl font-bold">Session Jeu</h1>
          </Link>
          <nav className="flex gap-4">
            <Link href="/catalogue">
              <Button variant="ghost">Catalogue</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Catalogue</h2>
          <p className="mt-2 text-muted-foreground">
            Sessions de compétitions stratégiques disponibles
          </p>
        </div>

        {result.data.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              Aucune session disponible pour le moment.
            </p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="outline">Retour à l&apos;accueil</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map(
                (session: {
                  code: string;
                  name: string;
                  description: string | null;
                  entryFee: number;
                  maxPlayers: number;
                  prizePool: number;
                  startTime: string | null;
                  status: string;
                  placesRemaining: number;
                }) => (
                  <SessionCard key={session.code} {...session} />
                )
              )}
            </div>

            {result.meta.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {page > 1 && (
                  <Link href={`/catalogue?page=${page - 1}`}>
                    <Button variant="outline">Précédent</Button>
                  </Link>
                )}
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {result.meta.page} / {result.meta.totalPages}
                </span>
                {page < result.meta.totalPages && (
                  <Link href={`/catalogue?page=${page + 1}`}>
                    <Button variant="outline">Suivant</Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
