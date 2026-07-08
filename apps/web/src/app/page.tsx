import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Session Jeu - Compétitions Stratégiques en Ligne",
  description:
    "Rejoignez des sessions de compétitions stratégiques en temps réel. Testez votre adresse, votre réflexion et votre stratégie dans un cadre structuré et équitable.",
  openGraph: {
    title: "Session Jeu - Compétitions Stratégiques en Ligne",
    description: "Rejoignez des sessions de compétitions stratégiques en temps réel.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Session Jeu</h1>
          <nav className="flex gap-4">
            <Link href="/catalogue">
              <Button variant="ghost">Catalogue</Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost">Notifications</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Compétitions Stratégiques</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Affrontez d&apos;autres joueurs dans des sessions de compétitions structurées.
            Réflexion, stratégie et adresse au programme dans un cadre équitable et transparent.
          </p>
          <Link href="/catalogue">
            <Button size="lg">Voir les sessions disponibles</Button>
          </Link>
        </section>

        <Separator />

        <section className="container mx-auto px-4 py-16">
          <h3 className="mb-8 text-center text-2xl font-semibold">Comment ça marche</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>1. Choisissez une session</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Parcourez le catalogue et trouvez une session qui vous convient. Chaque session a
                  ses propres règles et prix d&apos;inscription.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>2. Inscrivez-vous</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Créez votre compte gratuitement, puis inscrivez-vous à la session de votre choix.
                  Le paiement est sécurisé et transparent.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>3. Jouez et progressez</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Participez aux rounds, éliminez vos adversaires et progressez dans le classement.
                  Les performances sont évaluées à chaque round selon les règles définies par
                  l&apos;organisateur.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section className="container mx-auto px-4 py-16 text-center">
          <h3 className="mb-4 text-2xl font-semibold">Une expérience équitable</h3>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Toutes les sessions sont supervisées par serveur. Les règles sont transparentes, les
            résultats sont auditables et l&apos;expérience est conçue pour valoriser l&apos;adresse
            et la stratégie.
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          Session Jeu &copy; {new Date().getFullYear()} &mdash; Plateforme de compétitions
          stratégiques
        </div>
      </footer>
    </div>
  );
}
