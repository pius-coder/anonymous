"use client";

import { useCallback, useEffect, useReducer } from "react";
import { motion, AnimatePresence } from "motion/react";
import { juice } from "@/lib/juice";

type DuelPhase = "WAIT" | "ARMED" | "SIGNAL" | "LOCKED";

type MancheResult = { winnerUserId: string | null; yourMs: number | null; oppMs: number | null; falseStart?: string };

function duelReducer(state: DuelPhase, action: "arm" | "signal" | "tap" | "result"): DuelPhase {
  switch (action) {
    case "arm": return "ARMED";
    case "signal": return state === "ARMED" ? "SIGNAL" : state;
    case "tap": return "LOCKED";
    case "result": return "WAIT";
    default: return state;
  }
}

type Props = {
  you: { userId: string; name: string };
  opponent: { userId: string; name: string };
  signalOn: boolean;
  armed: boolean;
  lastResult: MancheResult | null;
  score: { you: number; opp: number };
  roundsToWin: number;
  onTap: () => void;
  readOnly?: boolean;
};

function Pips({ n, total }: { n: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="size-3 rounded-full border border-white/25 shadow-sm"
          style={{ backgroundColor: i < n ? "var(--arena-gold)" : "transparent" }}
        />
      ))}
    </div>
  );
}

export function ReactionDuelGame({
  you,
  opponent,
  signalOn,
  armed,
  lastResult,
  score,
  roundsToWin,
  onTap,
  readOnly,
}: Props) {
  const [phase, dispatch] = useReducer(duelReducer, "WAIT");

  useEffect(() => {
    if (armed && !lastResult) dispatch("arm");
  }, [armed, lastResult]);
  useEffect(() => {
    if (signalOn) {
      dispatch("signal");
      juice.play("signal_go");
      juice.vibrate("tap");
    }
  }, [signalOn]);
  useEffect(() => {
    if (lastResult) dispatch("result");
  }, [lastResult]);

  const tap = useCallback(() => {
    if (readOnly || phase === "WAIT" || phase === "LOCKED") return;
    dispatch("tap");
    if (phase === "ARMED") juice.vibrate("error");
    onTap();
  }, [phase, onTap, readOnly]);

  const bg =
    phase === "SIGNAL" ? "var(--arena-safe)" : phase === "ARMED" ? "var(--arena-danger)" : "var(--arena-ink)";

  return (
    <button
      type="button"
      onPointerDown={tap}
      disabled={readOnly}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/15 touch-manipulation select-none shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_24px_70px_rgb(0_0_0/0.38)] outline-none"
      style={{ backgroundColor: bg, transition: "background-color 80ms" }}
      aria-label="Zone de réaction — tape dès que l'écran devient vert"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 md:absolute md:left-0 md:top-0 md:h-full md:w-1/3">
        <div className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-secondary font-head text-xl text-secondary-foreground shadow-lg">
          {opponent.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-head text-sm text-foreground/80">{opponent.name}</span>
        <Pips n={score.opp} total={roundsToWin} />
        {lastResult?.oppMs != null && (
          <span className="font-mono text-xs text-foreground/60">{lastResult.oppMs} ms</span>
        )}
      </div>

      <div className="pointer-events-none flex flex-[2] items-center justify-center md:absolute md:inset-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase + String(lastResult?.winnerUserId ?? "")}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 14 }}
            className="px-6 text-center font-head text-4xl md:text-7xl text-white drop-shadow-[0_8px_24px_rgb(0_0_0/0.55)]"
          >
            {phase === "WAIT" && !lastResult && "PRÉPARE-TOI"}
            {phase === "WAIT" && lastResult && (
              lastResult.falseStart === you.userId
                ? "FAUX DÉPART !"
                : lastResult.winnerUserId === you.userId
                  ? "MANCHE GAGNÉE ✔"
                  : "MANCHE PERDUE"
            )}
            {phase === "ARMED" && "ATTENDS…"}
            {phase === "SIGNAL" && "GO ! TAPE !"}
            {phase === "LOCKED" && "…"}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 md:absolute md:right-0 md:top-0 md:h-full md:w-1/3">
        <div className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-primary font-head text-xl text-primary-foreground shadow-lg">
          {you.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-head text-sm text-foreground/80">{you.name} (toi)</span>
        <Pips n={score.you} total={roundsToWin} />
        {lastResult?.yourMs != null && (
          <span className="font-mono text-xs text-foreground/60">{lastResult.yourMs} ms</span>
        )}
      </div>
    </button>
  );
}
