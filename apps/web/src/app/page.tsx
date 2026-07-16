import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Gamepad2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uiParties } from "@/lib/ui-data";

export default function HomePage() {
  const featured = uiParties.filter((party) => party.status !== "review").slice(0, 3);

  return (
    <PublicShell>
      <main>
        <section className="relative flex min-h-[78dvh] items-end overflow-hidden border-b border-border">
          <Image
            src="/game-assets/kenney-tiny-dungeon/Sample.png"
            alt="Aperçu d’une room de jeu Noya en pixel art"
            fill
            priority
            className="scale-125 object-cover [image-rendering:pixelated] sm:scale-110"
          />
          <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-14 pt-24 sm:px-6 lg:grid-cols-[minmax(0,44rem)_1fr] lg:items-end">
            <div>
              <Badge className="mb-5"><Sparkles /> Parties multijoueurs en direct</Badge>
              <h1 className="max-w-3xl font-head text-4xl font-black leading-tight sm:text-6xl">NOYA</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
                Rejoignez une room, relevez des manches de mini-jeux et découvrez vos résultats après vérification officielle.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" render={<Link href="/parties" />}>Découvrir les parties <ArrowRight /></Button>
                <Button size="lg" variant="outline" render={<Link href="/auth/register" />}>Créer mon compte</Button>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 border-t border-white/30 pt-5 text-white lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <Stat value="120" label="mini-jeux au catalogue" />
              <Stat value="3" label="phases par manche" />
              <Stat value="100%" label="scores vérifiés" />
            </dl>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6" aria-labelledby="featured-parties">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="app-eyebrow">Prochaines sessions</p>
              <h2 id="featured-parties" className="mt-2 font-head text-2xl font-bold sm:text-3xl">Choisissez votre prochaine partie</h2>
            </div>
            <Button variant="ghost" render={<Link href="/parties" />}>Tout voir <ArrowRight /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((party) => (
              <article key={party.id} className="grid min-h-64 content-between border-2 border-border bg-card p-5 shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-3"><Badge variant="outline">{party.entryFee}</Badge><span className="font-mono text-xs text-muted-foreground">{party.code}</span></div>
                  <h3 className="mt-5 font-head text-xl font-bold">{party.name}</h3>
                  <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Gamepad2 size={17} /> {party.game}</span>
                    <span className="flex items-center gap-2"><CalendarClock size={17} /> {party.startsAt}</span>
                    <span className="flex items-center gap-2"><Users size={17} /> {party.players}/{party.capacity} joueurs</span>
                  </div>
                </div>
                <Button className="mt-6 w-full" variant="secondary" render={<Link href={`/parties/${party.code}`} />}>Voir la partie <ArrowRight /></Button>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
            <Value icon={Gamepad2} title="Jouez ensemble" copy="Des rooms sociales et des manches courtes pilotées en direct." />
            <Value icon={ShieldCheck} title="Résultats fiables" copy="Aucun score provisoire n’est affiché avant sa publication." />
            <Value icon={Users} title="Un parcours lisible" copy="Chaque phase indique clairement votre statut et votre prochaine action." />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><dt className="font-head text-2xl font-black text-primary">{value}</dt><dd className="mt-1 text-xs leading-snug text-white/65">{label}</dd></div>;
}

function Value({ icon: Icon, title, copy }: { icon: typeof Gamepad2; title: string; copy: string }) {
  return <article className="flex gap-4"><span className="metric-icon shrink-0"><Icon /></span><div><h2 className="font-head text-base font-bold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p></div></article>;
}
