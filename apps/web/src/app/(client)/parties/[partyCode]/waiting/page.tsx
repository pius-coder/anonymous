import { PlayerRuntimePage } from "@/components/player/PlayerRuntimePage";

export default async function PlayerWaitingPage({
  params,
}: {
  params: Promise<{ partyCode: string }>;
}) {
  const { partyCode } = await params;
  const code = decodeURIComponent(partyCode).toUpperCase();
  return <PlayerRuntimePage partyCode={code} mode="waiting" />;
}
