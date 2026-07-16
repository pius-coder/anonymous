import { PartySetupView } from "@/components/admin/PartySetupView";

export default async function AdminPartySetupPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  return <PartySetupView partyId={decodeURIComponent(partyId)} mode="edit" />;
}
