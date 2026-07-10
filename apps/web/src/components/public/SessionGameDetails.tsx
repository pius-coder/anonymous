import type { SessionDetail } from "@/services/sessions/types";
import { SessionInfoCard } from "@/components/public/SessionInfoCard";
import { SessionCapacityCard } from "@/components/public/SessionCapacityCard";
import { SessionRulesCard } from "@/components/public/SessionRulesCard";

export function SessionGameDetails({
  session,
  isFull,
  registeredPlayers,
  fillPercent,
}: {
  session: SessionDetail;
  isFull: boolean;
  registeredPlayers: number;
  fillPercent: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SessionInfoCard session={session} />
      <SessionCapacityCard session={session} isFull={isFull} registeredPlayers={registeredPlayers} fillPercent={fillPercent} />
      <SessionRulesCard />
    </div>
  );
}
