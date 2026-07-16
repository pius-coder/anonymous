import { notFound } from "next/navigation";
import { PartyDetailView } from "@/components/party/PartyDetailView";
import { getPublicPartyByCode } from "@/services/session/sessionAdapter";

export default async function PartyDetailsPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();
  const result = await getPublicPartyByCode(code);

  if (
    !result.success &&
    (result.error.code === "PARTY_NOT_FOUND" || result.error.code === "PARTY_INACCESSIBLE")
  ) {
    notFound();
  }

  return (
    <PartyDetailView partyCode={code} initialParty={result.success ? result.data : undefined} />
  );
}
