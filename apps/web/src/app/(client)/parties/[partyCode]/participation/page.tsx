import { ParticipationPanel } from "@/components/player/ParticipationPanel";
import { AppShell } from "@/components/ui/AppShell";

export default async function ParticipationPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();

  return (
    <AppShell
      audience="Joueur"
      eyebrow={code}
      title="Votre participation"
      subtitle="Réservez une place personnelle. Capacité et permissions sont vérifiées côté serveur."
    >
      <ParticipationPanel partyCode={code} />
    </AppShell>
  );
}
