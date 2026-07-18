import { PartyAdminNav } from "@/components/admin/AdminWorkspace";
import { AdminScoresPanel } from "@/components/admin/AdminScoresPanel";
import { AppShell } from "@/components/ui/AppShell";

export default async function AdminPartyScoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ partyId: string }>;
  searchParams: Promise<{ roundId?: string }>;
}) {
  const { partyId: raw } = await params;
  const { roundId = "" } = await searchParams;
  const partyId = decodeURIComponent(raw);

  return (
    <AppShell
      audience="Admin"
      eyebrow="Publication · accès restreint"
      title="Scores provisoires"
      subtitle="Vérifier, corriger avec raison d'audit, puis publier une version officielle explicite."
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="scores" />
        <AdminScoresPanel partyId={partyId} roundId={roundId} />
      </div>
    </AppShell>
  );
}
