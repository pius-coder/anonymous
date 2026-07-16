import { RoundPhaseView } from "@/components/round/RoundPhaseView";
import { AppShell } from "@/components/ui/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { PlayerJourneyNav } from "@/components/player/PlayerJourneyNav";
import { findPlayerParty } from "@/components/player/player-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PlayerWaitingPageProps = {
  params: Promise<{ partyCode: string }>;
};

export default async function PlayerWaitingPage({ params }: PlayerWaitingPageProps) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Vérification"
      title="Résultats en cours de vérification"
      subtitle="Les résultats restent privés jusqu’à la publication explicite de l’administrateur."
    >
      <PlayerJourneyNav party={party} current="round" />
      <RoundPhaseView
        partyCode={party.code}
        roundNumber={1}
        minigameName={party.game}
        phase="finished"
        connection="stable"
        deadlineLabel="Manche fermée"
      />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Prochaine étape</CardTitle>
          <CardDescription>
            Les scores et rangs restent invisibles pendant la vérification.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline">
            <RefreshCw /> Actualiser le statut
          </Button>
          <Button disabled>Résultats pas encore publiés</Button>
          <Button variant="ghost" render={<Link href="/me/tickets" />}>
            Retour à mes parties
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
