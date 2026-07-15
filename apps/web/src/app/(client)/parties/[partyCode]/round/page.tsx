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
      eyebrow="Manche live"
      title="Briefing de la manche"
      subtitle="Votre interface joueur ne montre ni score provisoire ni état privé concurrent."
    >
      <RoundPhaseView
        partyCode={decodeURIComponent(partyCode)}
        roundNumber={1}
        minigameName="Mémoire mystique"
        phase="briefing"
        connection="stable"
        deadlineLabel="Attente admin"
      />
    </AppShell>
  );
}
