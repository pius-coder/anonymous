import { AppShell } from "@/components/ui/AppShell";
import { RoundPhaseView } from "@/components/round/RoundPhaseView";

type PlayerRoundPageProps = {
  params: Promise<{ partyCode: string }>;
};

export default async function PlayerRoundPage({ params }: PlayerRoundPageProps) {
  const { partyCode } = await params;

  return (
    <AppShell
      audience="Joueur"
      eyebrow="Live joueur"
      title="Briefing de manche"
      subtitle="Projection joueur sans score provisoire ni etat prive concurrent."
    >
      <RoundPhaseView
        partyCode={decodeURIComponent(partyCode)}
        roundNumber={1}
        minigameName="Pilot memory sequence"
        phase="briefing"
        connection="stable"
        deadlineLabel="Attente admin"
      />
    </AppShell>
  );
}

