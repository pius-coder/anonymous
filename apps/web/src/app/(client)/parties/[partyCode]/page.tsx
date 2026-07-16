import { PartyDetailView } from "@/components/party/PartyDetailView";

export default async function PartyDetailsPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  return <PartyDetailView partyCode={partyCode} />;
}
