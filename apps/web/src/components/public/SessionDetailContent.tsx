import type { SessionDetail } from "@/services/sessions/types";
import { Separator } from "@/components/retroui/separator";
import { SessionHero } from "@/components/public/SessionHero";
import { SessionGameDetails } from "@/components/public/SessionGameDetails";
import { SessionMetaPanel } from "@/components/public/SessionMetaPanel";

export function SessionDetailContent({
  session,
  code,
}: {
  session: SessionDetail;
  code: string;
}) {
  const isFull = session.placesRemaining <= 0;
  const isClosed = session.status === "COMPLETED" || session.status === "CANCELLED";
  const registeredPlayers =
    session.registrationCount ?? Math.max(0, session.maxPlayers - session.placesRemaining);
  const fillPercent =
    session.maxPlayers > 0
      ? Math.min(100, Math.round((registeredPlayers / session.maxPlayers) * 100))
      : 0;

  return (
    <>
      <SessionHero session={session} code={code} isFull={isFull} isClosed={isClosed} />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_0.78fr]">
        <SessionGameDetails session={session} isFull={isFull} registeredPlayers={registeredPlayers} fillPercent={fillPercent} />
        <SessionMetaPanel />
      </section>
      <Separator />
    </>
  );
}
