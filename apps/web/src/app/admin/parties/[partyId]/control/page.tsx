import { PartyAdminNav } from "@/components/admin/AdminWorkspace";
import { AdminPreparationPanel } from "@/components/admin/AdminPreparationPanel";
import { AppShell } from "@/components/ui/AppShell";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

export default async function AdminRoundControlPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: rawPartyId } = await params;
  const partyId = decodeURIComponent(rawPartyId);

  return (
    <AppShell
      audience="Admin"
      eyebrow="Command center · préparation"
      title="Préparation de partie"
      subtitle="Commandes manuelles auditables. Aucun timer ne démarre la partie."
      actions={
        <div className="flex items-center gap-2">
          <ConnectionStatus state="stable" />
        </div>
      }
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="control" />
        <AdminPreparationPanel partyId={partyId} />
      </div>
    </AppShell>
  );
}
