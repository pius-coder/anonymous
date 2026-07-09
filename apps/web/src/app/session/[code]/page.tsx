import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Progress } from "@/components/retroui/progress";
import { Separator } from "@/components/retroui/separator";
import { PhaseFlowImage } from "@/components/game/generated-art";
import { SessionConsoleSvg, WalletFlowSvg } from "@/components/game/game-visuals";
import { SessionInscriptionCTA } from "@/components/auth/SessionInscriptionCTA";

async function getSession(code: string) {
  const apiBase = process.env.API_URL || "http://localhost:3001";
  const res = await fetch(`${apiBase}/v1/public/sessions/${code}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date à confirmer";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const session = await getSession(code);
  if (!session) return { title: "Session introuvable" };

  return {
    title: `${session.name} | Session Jeu`,
    description: session.description || `Session ${session.name}`,
    openGraph: {
      title: session.name,
      description: session.description || "",
      type: "website",
    },
  };
}

export default async function SessionDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await getSession(code);

  if (!session) notFound();

  const isFull = session.placesRemaining <= 0;
  const isClosed = session.status === "COMPLETED" || session.status === "CANCELLED";
  const registeredPlayers =
    session.registrationCount ?? Math.max(0, session.maxPlayers - session.placesRemaining);
  const fillPercent =
    session.maxPlayers > 0
      ? Math.min(100, Math.round((registeredPlayers / session.maxPlayers) * 100))
      : 0;

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="flex flex-col justify-center">
          <Link href="/catalogue" className="mb-5 inline-flex w-fit">
            <Button variant="outline" size="sm">
              &larr; Retour au catalogue
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Badge>{session.status}</Badge>
            <Badge variant="outline">Code {code}</Badge>
          </div>
          <h1 className="mt-5 text-5xl font-black uppercase leading-none sm:text-6xl">
            {session.name}
          </h1>
          {session.description && (
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {session.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <SessionInscriptionCTA
              session={{
                id: session.id,
                code,
                title: session.name,
                entryFeeXaf: session.entryFee,
              }}
              disabled={isFull || isClosed}
            />
            <Link href="/catalogue">
              <Button variant="outline" size="lg">
                Autres sessions
              </Button>
            </Link>
          </div>
        </div>
        <SessionConsoleSvg className="border-2 border-border shadow-xl" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_0.78fr]">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-head text-2xl uppercase">Détails</CardTitle>
              <CardAction>
                <Badge variant="secondary">Serveur</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Début</span>
                <span className="text-right font-medium">{formatDate(session.startTime)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Inscription</span>
                <span className="font-mono font-black tabular-nums">
                  {formatCurrency(session.entryFee)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Crédits internes configurés</span>
                <span className="font-mono font-black tabular-nums">
                  {formatCurrency(session.prizePool)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-head text-2xl uppercase">Capacité</CardTitle>
              <CardAction>
                <Badge variant={isFull ? "destructive" : "outline"}>
                  {isFull ? "Complet" : `${session.placesRemaining} libre(s)`}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacité maximale</span>
                <span>{session.maxPlayers} joueurs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inscrits</span>
                <span>{registeredPlayers}</span>
              </div>
              <Progress value={fillPercent} aria-label="Remplissage de la session" />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="font-head text-2xl uppercase">Règles essentielles</CardTitle>
              <CardAction>
                <Badge variant="outline">Lisible avant inscription</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground md:grid-cols-2">
              <p>&bull; Les sessions sont supervisées par serveur pour garantir l&apos;équité.</p>
              <p>&bull; Les résultats sont auditables après validation officielle.</p>
              <p>&bull; Le paiement doit être confirmé avant l&apos;accès à la session.</p>
              <p>&bull; La politique d&apos;annulation doit être consultée avant inscription.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PhaseFlowImage className="shadow-md" />
          <WalletFlowSvg className="border-2 border-border shadow-md" />
          <Card>
            <CardHeader>
              <CardTitle className="font-head text-2xl uppercase">États préparés</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Lobby</Badge>
              <Badge variant="secondary">Check-in</Badge>
              <Badge variant="outline">Round</Badge>
              <Badge variant="outline">Résultats</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />
    </>
  );
}
