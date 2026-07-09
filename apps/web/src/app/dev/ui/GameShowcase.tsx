"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";
import { MemorySequenceGame } from "@/components/games/MemorySequenceGame";
import { ReactionDuelGame } from "@/components/games/ReactionDuelGame";
import { SafeZonesGame } from "@/components/games/SafeZonesGame";

const DEMO_PLAYERS = [
  { userId: "u1", name: "Toi", cell: 0, eliminated: false },
  { userId: "u2", name: "Ada", cell: 2, eliminated: false },
  { userId: "u3", name: "Bob", cell: null, eliminated: true },
];

export function GameShowcase() {
  const [seq, setSeq] = useState<number[]>([0, 2, 1, 3]);
  const [duelResult, setDuelResult] = useState<null | {
    winnerUserId: string | null;
    yourMs: number | null;
    oppMs: number | null;
    falseStart?: string;
  }>(null);
  const [safe, setSafe] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [lockAtEpochMs] = useState(() => Date.now() + 30_000);

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center gap-3">
        <Badge>MINI-JEUX</Badge>
        <h2 className="font-head text-3xl font-black uppercase">Surfaces de jeu</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-head uppercase">Memory Sequence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] border-2 border-border">
              <MemorySequenceGame incomingSequence={seq} level={2} onSubmit={() => {}} />
            </div>
            <Button size="sm" className="mt-3" onClick={() => setSeq([...seq].sort(() => Math.random() - 0.5))}>
              Nouvelle séquence
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-head uppercase">Reaction Duel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] border-2 border-border">
              <ReactionDuelGame
                you={{ userId: "u1", name: "Toi" }}
                opponent={{ userId: "u2", name: "Ada" }}
                signalOn={false}
                armed
                lastResult={duelResult}
                score={{ you: 1, opp: 0 }}
                roundsToWin={3}
                onTap={() => setDuelResult({ winnerUserId: "u1", yourMs: 212, oppMs: 260 })}
              />
            </div>
            <Button size="sm" className="mt-3" onClick={() => setDuelResult(null)}>
              Reset manche
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-head uppercase">Safe Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] border-2 border-border">
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
            </div>
            <Button size="sm" className="mt-3" onClick={() => setSafe([10, 11, 12, 13, 14])}>
              Nouveau tour
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
