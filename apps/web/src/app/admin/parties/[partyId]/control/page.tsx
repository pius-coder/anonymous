import { AdminRoundControls } from "@/components/admin/AdminRoundControls";
import { AppShell } from "@/components/ui/AppShell";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

type AdminRoundControlPageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function AdminRoundControlPage({ params }: AdminRoundControlPageProps) {
  const { partyId } = await params;

  return (
    <AppShell
      audience="Admin"
      eyebrow="Pilotage live"
      title="Contrôle de la manche"
      subtitle="Commandes manuelles auditables : briefing, démarrage, pause, reprise et fermeture sans publication."
      actions={<ConnectionStatus state="stable" />}
    >
      <AdminRoundControls
        partyId={decodeURIComponent(partyId)}
        roundId="round-preview"
        status="briefing"
        lateInputs={0}
        duplicateInputs={0}
      />
    </AppShell>
  );
}
