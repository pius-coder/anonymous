"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

type Route = { id: string; label: string; risk: string };
type Pair = { userId: string; pairId: string };

const DEFAULT_ROUTES: Route[] = [
  { id: "alpha", label: "Alpha", risk: "stable" },
  { id: "beta", label: "Beta", risk: "instable" },
  { id: "gamma", label: "Gamma", risk: "rapide" },
];

export function TrustBridgeGame({
  routes = DEFAULT_ROUTES,
  pairs = [],
  youUserId,
  players,
  onChoose,
  readOnly,
}: {
  routes?: Route[];
  pairs?: Pair[];
  youUserId: string;
  players: Array<{ userId: string; displayName: string; isEliminated?: boolean }>;
  onChoose: (routeId: string) => void;
  readOnly?: boolean;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const myPairId = pairs.find((pair) => pair.userId === youUserId)?.pairId;
  const ally = useMemo(() => {
    if (!myPairId) return null;
    const allyPair = pairs.find((pair) => pair.pairId === myPairId && pair.userId !== youUserId);
    return players.find((player) => player.userId === allyPair?.userId) ?? null;
  }, [myPairId, pairs, players, youUserId]);

  const choose = (routeId: string) => {
    if (readOnly || choice) return;
    setChoice(routeId);
    juice.vibrate("tap");
    onChoose(routeId);
  };

  return (
    <div className="game-surface flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <p className="font-head text-3xl font-black uppercase text-[--arena-gold]">Pont de confiance</p>
        <p className="text-sm text-muted-foreground">
          {readOnly ? "Mode spectateur" : ally ? `Allie: ${ally.displayName}` : "Binome en attribution"}
        </p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
        {routes.map((route, index) => {
          const selected = choice === route.id;
          return (
            <motion.button
              key={route.id}
              type="button"
              disabled={readOnly || Boolean(choice)}
              onPointerDown={() => choose(route.id)}
              whileTap={{ scale: 0.97 }}
              className="relative min-h-52 overflow-hidden border-4 border-border bg-card p-4 text-left disabled:cursor-not-allowed"
            >
              <div className="absolute inset-x-6 top-1/2 h-5 -translate-y-1/2 border-2 border-border bg-[--arena-teal]" />
              <div
                className="absolute top-1/2 size-16 -translate-y-1/2 border-4 border-border bg-[--arena-pink]"
                style={{ left: `${18 + index * 8}%` }}
              />
              <div className="relative z-10">
                <p className="font-head text-3xl font-black uppercase">{route.label}</p>
                <p className="mt-1 text-xs uppercase text-muted-foreground">{route.risk}</p>
              </div>
              {selected && (
                <div className="absolute inset-0 grid place-items-center bg-[--arena-green]/85 font-head text-2xl font-black uppercase text-white">
                  Choix envoye
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="font-head text-center text-sm text-muted-foreground" aria-live="polite">
        {readOnly ? "Les binomes sont visibles sans action possible." : choice ? "En attente de la validation serveur." : "Choisis la meme route que ton allie."}
      </p>
    </div>
  );
}
