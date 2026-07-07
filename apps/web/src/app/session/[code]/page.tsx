import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CTAButton } from "@/components/CTAButton";

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

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getSession(code);

  if (!session) notFound();

  const isFull = session.placesRemaining <= 0;
  const isClosed = session.status === "COMPLETED" || session.status === "CANCELLED";

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

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link href="/catalogue" className="mb-6 inline-block">
          <Button variant="ghost" size="sm">
            &larr; Retour au catalogue
          </Button>
        </Link>

        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{session.name}</h2>
            <div className="mt-2 flex gap-2">
              <Badge>{session.status}</Badge>
            </div>
          </div>
        </div>

        {session.description && (
          <p className="mb-8 text-muted-foreground">{session.description}</p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Détails de la session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de début</span>
                <span>{formatDate(session.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais d&apos;inscription</span>
                <span className="font-medium">{formatCurrency(session.entryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prize pool</span>
                <span className="font-medium">{formatCurrency(session.prizePool)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Places disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacité maximale</span>
                <span>{session.maxPlayers} joueurs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Places restantes</span>
                <span className="font-medium">
                  {isFull ? (
                    <span className="text-destructive">Session complète</span>
                  ) : (
                    `${session.placesRemaining} place(s)`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inscrits</span>
                <span>{session.registrationCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Règles essentielles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              &bull; Les sessions sont supervisées par serveur pour garantir
              l&apos;équité.
            </p>
            <p>
              &bull; Les résultats sont auditableset ne peuvent pas être
              modifiés après validation.
            </p>
            <p>
              &bull; Le paiement doit être confirmé avant l&apos;accès à la
              session.
            </p>
            <p>
              &bull; Consultez la politique d&apos;annulation et de
              remboursement avant de vous inscrire.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-4">
          <CTAButton
            label="S'inscrire à cette session"
            href="#"
            disabled={isFull || isClosed}
          />
          <Link href="/catalogue">
            <Button variant="outline">Autres sessions</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
