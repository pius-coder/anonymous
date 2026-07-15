import { AppShell } from "@/components/ui/AppShell";
import { ResultsView } from "@/components/party/ResultsView";

export default async function ResultsPage({ params }: { params: Promise<{ partyCode: string }> }) {
  const { partyCode } = await params;
  return <AppShell audience="Joueur" eyebrow={partyCode} title="Résultats officiels" subtitle="Classement visible uniquement après la publication explicite des scores."><ResultsView /></AppShell>;
}
