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
      eyebrow="Verification"
      title="Attente de verification"
      subtitle="Les resultats ne sont pas publics avant publication admin explicite."
    >
      <RoundPhaseView
        partyCode={decodeURIComponent(partyCode)}
        roundNumber={1}
        minigameName="Pilot memory sequence"
        phase="finished"
        connection="stable"
        deadlineLabel="Round ferme"
      />
    </AppShell>
  );
}

