import { PlayerReadonlySnapshot } from "@/components/support/PlayerReadonlySnapshot";
import { AppShell } from "@/components/ui/AppShell";

export default async function SupportPlayerPage({
  params,
}: {
  params: Promise<{ partyId: string; playerId: string }>;
}) {
  const { partyId, playerId } = await params;
  return (
    <AppShell
      audience="Support"
      eyebrow="Diagnostic joueur"
      title="Snapshot autorisé"
      subtitle="Projection personnelle filtrée pour le support."
    >
      <PlayerReadonlySnapshot
        partyId={decodeURIComponent(partyId)}
        playerId={decodeURIComponent(playerId)}
      />
    </AppShell>
  );
}
