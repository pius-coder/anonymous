import Link from "next/link";
import type { SessionDetail } from "@/services/sessions/types";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { SessionInscriptionCTA } from "@/components/auth/SessionInscriptionCTA";
import { SessionConsoleSvg } from "@/components/game/game-visuals";

export function SessionHero({
  session,
  code,
  isFull,
  isClosed,
}: {
  session: SessionDetail;
  code: string;
  isFull: boolean;
  isClosed: boolean;
}) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
      <div className="flex flex-col justify-center">
        <Link href="/catalogue" className="mb-5 inline-flex w-fit">
          <Button variant="outline" size="sm">
            &larr; Retour au catalogue
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge>{session.status}</Badge>
          <Badge variant="outline">Code {code}</Badge>
        </div>
        <h1 className="mt-5 text-5xl font-black uppercase leading-none sm:text-6xl">
          {session.name}
        </h1>
        {session.description && (
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {session.description}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <SessionInscriptionCTA
            session={{
              id: session.id,
              code,
              title: session.name,
              entryFeeXaf: session.entryFee,
              status: session.status,
            }}
            disabled={isFull || isClosed}
          />
          <Link href="/catalogue">
            <Button variant="outline" size="lg">
              Autres sessions
            </Button>
          </Link>
        </div>
      </div>
      <SessionConsoleSvg className="border-2 border-border shadow-xl" />
    </section>
  );
}
