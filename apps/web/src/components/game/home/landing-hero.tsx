import Link from "next/link";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { HeroGeneratedImage } from "@/components/game/generated-art";

export function LandingHero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:py-12">
      <div>
        <Badge className="mb-5">Lobby temps réel · serveur maître</Badge>
        <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl lg:text-7xl">
          Compétitions stratégiques
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Entrez dans des sessions structurées où chaque round teste l&apos;adresse, la réflexion et
          le sang-froid. Le serveur décide, les actions sont traçables, et chaque étape reste
          lisible avant l&apos;inscription.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/catalogue">
            <Button size="lg">Voir les sessions disponibles</Button>
          </Link>
          <Link href="/catalogue">
            <Button size="lg" variant="outline">
              Explorer le catalogue
            </Button>
          </Link>
        </div>
      </div>
      <HeroGeneratedImage />
    </section>
  );
}
