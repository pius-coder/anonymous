"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { juice } from "@/lib/juice";
import { CountdownRing } from "@/components/game/motion-primitives";

type PlayerDot = { userId: string; name: string; cell: number | null; eliminated: boolean };

type Props = {
  gridSize: number;
  safeCells: number[];
  lockAtEpochMs: number;
  players: PlayerDot[];
  youUserId: string;
  myClaim: number | null;
  locked: boolean;
  onClaim: (cell: number) => void;
  readOnly?: boolean;
};

export function SafeZonesGame({
  gridSize,
  safeCells,
  lockAtEpochMs,
  players,
  youUserId,
  myClaim,
  locked,
  onClaim,
  readOnly,
}: Props) {
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const safe = useMemo(() => new Set(safeCells), [safeCells]);

  const occupants = useMemo(() => {
    const map = new Map<number, PlayerDot[]>();
    for (const p of players) if (p.cell !== null && !p.eliminated) map.set(p.cell, [...(map.get(p.cell) ?? []), p]);
    return map;
  }, [players]);

  const claim = useCallback(
    (cell: number) => {
      if (readOnly || locked || !safe.has(cell)) return;
      if (occupants.get(cell)?.some((o) => o.userId !== youUserId)) {
        juice.vibrate("error");
        return;
      }
      setPendingCell(cell);
      juice.vibrate("tap");
      onClaim(cell);
    },
    [readOnly, locked, safe, occupants, youUserId, onClaim],
  );

  const alive = players.filter((p) => !p.eliminated).length;

  return (
    <div className="game-surface flex h-full min-h-0 flex-col items-center gap-3 p-3 md:justify-center">
      <div className="flex w-full max-w-[min(94vw,560px)] items-center justify-between">
        <div className="border-2 border-border bg-card px-3 py-1 shadow-sm">
          <span className="font-head text-sm">CASES SÛRES : </span>
          <span className="font-head text-lg text-[--arena-green]">{safeCells.length}</span>
        </div>
        <CountdownRing deadlineEpochMs={lockAtEpochMs} totalMs={10_000} className="size-16" />
        <div className="border-2 border-border bg-card px-3 py-1 shadow-sm">
          <span className="font-head text-sm">👥 </span>
          <span className="font-head text-lg">{alive}</span>
        </div>
      </div>

      <div
        className="grid w-full max-w-[min(94vw,560px)] flex-1 md:flex-none gap-1.5 md:gap-2"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, aspectRatio: "1" }}
        role="grid"
        aria-label="Plateau des zones sûres"
      >
        {Array.from({ length: gridSize * gridSize }).map((_, cell) => {
          const isSafe = safe.has(cell);
          const occ = occupants.get(cell) ?? [];
          const mine = myClaim === cell;
          const pending = pendingCell === cell && !mine;

          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              disabled={!isSafe || locked || readOnly}
              onPointerDown={() => claim(cell)}
              className={`relative border-2 border-border touch-manipulation select-none ${
                isSafe ? "shadow-sm" : ""
              } ${!isSafe && locked ? "animate-red-flash" : ""}`}
              style={{
                backgroundColor: !isSafe
                  ? "var(--arena-ink)"
                  : mine
                    ? "var(--arena-gold)"
                    : occ.length > 0
                      ? "var(--arena-teal)"
                      : pending
                        ? "var(--accent)"
                        : "var(--card)",
                opacity: !isSafe ? 0.35 : 1,
                transition: "background-color 150ms",
              }}
              aria-label={
                !isSafe
                  ? "Case dangereuse"
                  : occ.length
                    ? `Case prise par ${occ[0].name}`
                    : "Case libre"
              }
            >
              <AnimatePresence>
                {occ.slice(0, 1).map((p) => (
                  <motion.div
                    key={p.userId}
                    layoutId={`dot-${p.userId}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="absolute inset-1 flex items-center justify-center border-2 border-border font-head text-[10px] md:text-xs"
                    style={{
                      backgroundColor: p.userId === youUserId ? "var(--primary)" : "var(--secondary)",
                      color: "#fff",
                    }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </motion.div>
                ))}
              </AnimatePresence>
              {pending && <div className="absolute inset-0 animate-danger-pulse" />}
            </button>
          );
        })}
      </div>

      <p className="font-head text-center text-sm md:text-base" aria-live="polite">
        {locked ? (
          <span className="text-[--arena-danger]">🔒 VERROUILLÉ — les cases dangereuses s&apos;effondrent…</span>
        ) : myClaim !== null ? (
          <span className="text-[--arena-green]">✔ Case sécurisée — tu peux encore bouger</span>
        ) : (
          <span className="text-[--arena-pink]">CHOISIS UNE CASE SÛRE AVANT LE VERROU !</span>
        )}
      </p>
    </div>
  );
}
