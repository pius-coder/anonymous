import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/retroui/empty";
import { Separator } from "@/components/retroui/separator";
import { CatalogueWallSvg, WalletFlowSvg } from "@/components/game/game-visuals";
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
  const sessionCount = result.meta.total ?? result.data.length;

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit">Catalogue live · inscriptions lisibles</Badge>
          <h1 className="mt-5 text-5xl font-black uppercase leading-none sm:text-6xl">Catalogue</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Comparez les sessions avant de rejoindre: statut, capacité, prix XAF, horaire et
            progression. L&apos;interface est pensée pour une lecture rapide sur mobile.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge variant="outline">{sessionCount} session(s)</Badge>
            <Badge variant="secondary">Timer serveur</Badge>
            <Badge variant="outline">Règles visibles</Badge>
          </div>
        </div>
        <CatalogueWallSvg className="border-2 border-border shadow-xl" />
      </section>

      <section className="border-y-2 border-border bg-card">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            {["Toutes", "Ouvertes", "En cours", "Aujourd'hui", "Capacité restante"].map(
              (filter, index) => (
                <Button key={filter} size="sm" variant={index === 0 ? "default" : "outline"}>
                  {filter}
                </Button>
              ),
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Données rafraîchies depuis l&apos;API publique
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {result.data.length === 0 ? (
          <Empty className="min-h-[360px]">
            <EmptyHeader>
              <EmptyMedia>
                <CatalogueWallSvg className="max-w-sm border-2 border-border shadow-md" />
              </EmptyMedia>
              <EmptyTitle className="font-head text-2xl uppercase">
                Aucune session disponible
              </EmptyTitle>
              <EmptyDescription>
                Revenez plus tard ou consultez l&apos;accueil pour comprendre le parcours
                d&apos;inscription.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/">
                <Button variant="outline">Retour à l&apos;accueil</Button>
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="font-head text-2xl uppercase">Sessions ouvertes</CardTitle>
                  <CardAction>
                    <Badge>{result.data.length} affichée(s)</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="leading-7 text-muted-foreground">
                    Chaque carte expose les informations essentielles avant décision: disponibilité,
                    date, montant XAF et accès au détail.
                  </p>
                </CardContent>
              </Card>
              <WalletFlowSvg className="border-2 border-border shadow-md" />
            </div>

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
                ),
              )}
            </div>

            {result.meta.totalPages > 1 && (
              <>
                <Separator className="my-8" />
                <div className="flex flex-wrap justify-center gap-3">
                  {page > 1 && (
                    <Link href={`/catalogue?page=${page - 1}`}>
                      <Button variant="outline">Précédent</Button>
                    </Link>
                  )}
                  <Badge variant="outline">
                    Page {result.meta.page} / {result.meta.totalPages}
                  </Badge>
                  {page < result.meta.totalPages && (
                    <Link href={`/catalogue?page=${page + 1}`}>
                      <Button variant="outline">Suivant</Button>
                    </Link>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
