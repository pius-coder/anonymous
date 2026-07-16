import { notFound } from "next/navigation";
import { RoomExperience } from "@/components/game/RoomExperience";
import { findPlayerParty } from "@/components/player/player-data";

export default async function PartyRoomPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const party = findPlayerParty(partyCode);
  if (!party) notFound();
  return <RoomExperience party={party} />;
}
