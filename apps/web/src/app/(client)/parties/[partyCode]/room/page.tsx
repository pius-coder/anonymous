import { notFound } from "next/navigation";
import { RoomExperience } from "@/components/game/RoomExperience";
import { getPublicPartyByCode } from "@/services/session/sessionAdapter";

export default async function PartyRoomPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();
  const result = await getPublicPartyByCode(code);
  if (!result.success) notFound();
  return <RoomExperience party={result.data} />;
}
