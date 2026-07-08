import { Badge } from "@/components/retroui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

const journeySteps = [
  {
    title: "1. Choisissez une session",
    badge: "Catalogue",
    text: "Consultez la date, le prix d'inscription, la capacité, les règles clés et le statut avant de rejoindre.",
  },
  {
    title: "2. Confirmez votre place",
    badge: "Paiement",
    text: "Créez votre compte, réservez votre place, puis validez l'inscription avant l'accès au lobby.",
  },
  {
    title: "3. Jouez les rounds",
    badge: "Live",
    text: "Chaque phase est pilotée par le serveur: timer, actions acceptées, scores et résultats officiels.",
  },
];

export function PlayerJourneySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Parcours joueur</Badge>
          <h2 className="mt-3 text-4xl font-black uppercase">Comment ça marche</h2>
        </div>
        <p className="max-w-xl text-muted-foreground">
          Un parcours dense et lisible pour mobile: choisir, confirmer, entrer au lobby, jouer, puis
          consulter les résultats officiels.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {journeySteps.map((step) => (
          <Card key={step.title} className="min-h-full">
            <CardHeader>
              <CardTitle className="font-head text-2xl uppercase">{step.title}</CardTitle>
              <CardAction>
                <Badge>{step.badge}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="leading-7 text-muted-foreground">{step.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
