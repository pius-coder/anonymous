import { getSupportParty } from "@/components/support/support-data";
import { SupportPartyWorkspace } from "@/components/support/SupportPartyWorkspace";
import { AppShell } from "@/components/ui/AppShell";

export default async function SupportPartyPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const party = getSupportParty(decodeURIComponent(partyId));
  return (
    <AppShell
      audience="Support"
      eyebrow={`Dossier ${party.code}`}
      title={party.name}
      subtitle="Diagnostic redigé et lecture seule; aucune commande de compétition n’est disponible."
    >
      <SupportPartyWorkspace party={party} />
    </AppShell>
  );
}
