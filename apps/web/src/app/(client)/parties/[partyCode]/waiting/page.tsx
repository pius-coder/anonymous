import { RoundPhaseView } from "@/components/round/RoundPhaseView";
import { AppShell } from "@/components/ui/AppShell";

type PlayerWaitingPageProps = {
  params: Promise<{ partyCode: string }>;
};

export default async function PlayerWaitingPage({ params }: PlayerWaitingPageProps) {
  const { partyCode } = await params;

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Vérification"
      title="Résultats en cours de vérification"
      subtitle="Les résultats restent privés jusqu’à la publication explicite de l’administrateur."
    >
      <RoundPhaseView
        partyCode={decodeURIComponent(partyCode)}
        roundNumber={1}
        minigameName="Mémoire mystique"
        phase="finished"
        connection="stable"
        deadlineLabel="Manche fermée"
      />
    </AppShell>
  );
}
