"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { DangerSweepGame } from "@/components/games/DangerSweepGame";
import { MemorySequenceGame } from "@/components/games/MemorySequenceGame";
import { ReactionDuelGame } from "@/components/games/ReactionDuelGame";
import { SafeZonesGame } from "@/components/games/SafeZonesGame";
import { SilentVoteGame } from "@/components/games/SilentVoteGame";
import { TeamRelayGame } from "@/components/games/TeamRelayGame";
import { TrustBridgeGame } from "@/components/games/TrustBridgeGame";

const DEMO_PLAYERS = [
  { userId: "u1", name: "Toi", displayName: "Toi", cell: 0, eliminated: false, x: 180, y: 170 },
  { userId: "u2", name: "Ada", displayName: "Ada", cell: 2, eliminated: false, x: 430, y: 260 },
  { userId: "u3", name: "Bob", displayName: "Bob", cell: null, eliminated: true, x: 710, y: 370 },
  { userId: "u4", name: "Luna", displayName: "Luna", cell: 4, eliminated: false, x: 620, y: 130 },
];

function ShowcaseCard({ family, title, children, actions }: {
  family: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">{family}</p>
          <CardTitle className="retro-title truncate text-lg">{title}</CardTitle>
        </div>
        <Badge variant="outline">Interactif</Badge>
      </CardHeader>
      <CardContent>
        <div className="premium-inset h-[430px] overflow-hidden rounded-[1.5rem]">{children}</div>
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  );
}

export function GameShowcase() {
  const [seq, setSeq] = useState<number[]>([0, 2, 1, 3]);
  const [duelResult, setDuelResult] = useState<null | {
    winnerUserId: string | null;
    yourMs: number | null;
    oppMs: number | null;
    falseStart?: string;
  }>(null);
  const [signalOn, setSignalOn] = useState(false);
  const [safe, setSafe] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [lockAtEpochMs, setLockAtEpochMs] = useState(() => Date.now() + 30_000);
  const [sweepStart, setSweepStart] = useState(() => Date.now());

  return (
    <section className="mb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Badge>MINI-JEUX</Badge>
            <span className="text-xs uppercase tracking-[0.18em] text-white/40">six familles, moteurs partagés</span>
          </div>
          <h2 className="retro-title text-3xl font-black">Surfaces de jeu premium</h2>
        </div>
        <p className="max-w-xl text-sm text-white/48">
          Démonstration des shells Solo, Duel, Alliance forcée, Équipe libre, Survie collective et Rôle caché.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ShowcaseCard
          family="Solo"
          title="Séquence mémoire"
          actions={
            <Button size="sm" onClick={() => setSeq((value) => [...value].sort(() => Math.random() - 0.5))}>
              Nouvelle séquence
            </Button>
          }
        >
          <MemorySequenceGame incomingSequence={seq} level={2} onSubmit={() => {}} />
        </ShowcaseCard>

        <ShowcaseCard
          family="Duel 1v1"
          title="Réaction pure"
          actions={
            <>
              <Button size="sm" onClick={() => setSignalOn((value) => !value)}>
                {signalOn ? "Masquer le signal" : "Déclencher GO"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDuelResult(null)}>Réinitialiser</Button>
            </>
          }
        >
          <ReactionDuelGame
            you={{ userId: "u1", name: "Toi" }}
            opponent={{ userId: "u2", name: "Ada" }}
            signalOn={signalOn}
            armed
            lastResult={duelResult}
            score={{ you: 1, opp: 0 }}
            roundsToWin={3}
            onTap={() => setDuelResult({ winnerUserId: "u1", yourMs: 212, oppMs: 260 })}
          />
        </ShowcaseCard>

        <ShowcaseCard family="Alliance forcée" title="Pont de confiance">
          <TrustBridgeGame
            pairs={[{ userId: "u1", pairId: "p1" }, { userId: "u2", pairId: "p1" }]}
            players={DEMO_PLAYERS}
            youUserId="u1"
            onChoose={() => {}}
          />
        </ShowcaseCard>

        <ShowcaseCard family="Équipe libre" title="Relais d’équipe">
          <TeamRelayGame
            teams={[
              { userId: "u1", teamId: "red" },
              { userId: "u2", teamId: "red" },
              { userId: "u3", teamId: "green" },
              { userId: "u4", teamId: "green" },
            ]}
            youUserId="u1"
            onStep={() => {}}
          />
        </ShowcaseCard>

        <ShowcaseCard
          family="Survie collective"
          title="Zones sûres"
          actions={
            <Button
              size="sm"
              onClick={() => {
                setSafe([10, 11, 12, 13, 14]);
                setLockAtEpochMs(Date.now() + 10_000);
              }}
            >
              Nouveau tour
            </Button>
          }
        >
          <SafeZonesGame
            gridSize={5}
            safeCells={safe}
            lockAtEpochMs={lockAtEpochMs}
            players={DEMO_PLAYERS}
            youUserId="u1"
            myClaim={0}
            locked={false}
            onClaim={() => {}}
          />
        </ShowcaseCard>

        <ShowcaseCard
          family="Survie collective · PixiJS"
          title="Rayon balayeur"
          actions={<Button size="sm" onClick={() => setSweepStart(Date.now())}>Relancer le rayon</Button>}
        >
          <DangerSweepGame
            sweep={{ fn: "linear", t0EpochMs: sweepStart, speed: 190, width: 78 }}
            players={DEMO_PLAYERS}
            youUserId="u1"
            onMove={() => {}}
          />
        </ShowcaseCard>

        <ShowcaseCard family="Rôle caché" title="Vote silencieux">
          <SilentVoteGame
            candidates={DEMO_PLAYERS.map((player) => ({
              userId: player.userId,
              displayName: player.displayName,
              hasVoted: player.userId === "u2",
            }))}
            youUserId="u1"
            voteRound={2}
            onVote={() => {}}
          />
        </ShowcaseCard>
      </div>
    </section>
  );
}
