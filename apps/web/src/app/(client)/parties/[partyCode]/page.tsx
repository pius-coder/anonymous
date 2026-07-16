import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gamepad2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uiParties } from "@/lib/ui-data";
import { isPartyFull } from "@/components/player/player-data";

export default async function PartyDetailsPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const party = uiParties.find((item) => item.code === decodeURIComponent(partyCode).toUpperCase());
  if (!party) notFound();
  const full = isPartyFull(party);
  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="app-eyebrow">{party.code}</p>
          <h1 className="mt-2 font-head text-3xl font-bold">{party.name}</h1>
          <p className="mt-2 text-muted-foreground">Tout ce qu’un joueur doit connaître avant de réserver sa place.</p>
        </header>
      <div className="party-details-layout">
        <div className="party-details-main">
          <Card className="party-hero-card">
            <CardHeader>
              <div className="party-card-topline">
                <Badge variant={full ? "secondary" : "default"}>
                  {full ? "Complet" : "Places ouvertes"}
                </Badge>
                <Badge variant="outline">{party.entryFee}</Badge>
              </div>
              <CardTitle className="font-head text-2xl">{party.name}</CardTitle>
              <CardDescription>
                Une session sociale compétitive en trois manches, avec résultats vérifiés avant
                publication.
              </CardDescription>
            </CardHeader>
            <CardContent className="party-facts-grid">
              <Fact icon={CalendarClock} label="Départ" value={party.startsAt} />
              <Fact
                icon={Users}
                label="Capacité"
                value={`${party.players}/${party.capacity} joueurs`}
              />
              <Fact icon={Gamepad2} label="Jeu vedette" value={party.game} />
              <Fact icon={WalletCards} label="Entrée" value={party.entryFee} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcours de la session</CardTitle>
              <CardDescription>Les étapes qui seront visibles côté joueur.</CardDescription>
            </CardHeader>
            <CardContent className="journey-list">
              {[
                "Inscription et paiement",
                "Check-in et room sociale",
                "Briefing avant chaque manche",
                "Résultats après vérification",
              ].map((step, index) => (
                <div key={step}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step}</strong>
                    <small>
                      {index === 3
                        ? "Aucun score provisoire ne sera exposé."
                        : "Validation claire avant de passer à l’étape suivante."}
                    </small>
                  </div>
                  <CheckCircle2 />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="booking-card">
          <CardHeader>
            <CardTitle>Votre place</CardTitle>
            <CardDescription>
              La réservation n’est définitive qu’après confirmation du paiement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="avatar-preview">
              <PixelAvatar seed="Vous" size="lg" />
              <span>
                <strong>Profil joueur</strong>
                <small>Connexion requise avant inscription</small>
              </span>
            </div>
            <div className="party-capacity">
              <div>
                <span>Remplissage</span>
                <strong>
                  {party.players}/{party.capacity}
                </strong>
              </div>
              <Progress value={(party.players / party.capacity) * 100} />
            </div>
            <div className="booking-total">
              <span>Montant à confirmer</span>
              <strong>{party.entryFee}</strong>
            </div>
            <Button
              render={<Link href={`/parties/${party.code}/participation`} />}
              className="w-full"
              size="lg"
              disabled={full}
            >
              {full ? "Partie complète" : "Réserver ma place"} <ArrowRight />
            </Button>
            <Button render={<Link href="/parties" />} className="mt-2 w-full" variant="outline">
              Retour au catalogue
            </Button>
            <p className="booking-safety">
              <ShieldCheck /> Paiement idempotent et remboursement tracé.
            </p>
          </CardContent>
        </Card>
      </div>
      </main>
    </PublicShell>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="party-fact">
      <Icon />
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
