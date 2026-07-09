"use client";

import { AnimatePresence, motion } from "motion/react";
import { CountdownRing } from "@/components/game/motion-primitives";
import type { LiveSnapshot, LivePlayer } from "@/hooks/useGameRoom";

export function GameShell({
  snap,
  status,
  children,
  reconnecting,
  eliminated,
  onReconnect,
}: {
  snap: LiveSnapshot | null;
  status: string;
  children: React.ReactNode;
  reconnecting?: boolean;
  eliminated?: boolean;
  onReconnect?: () => void;
}) {
  const alive = snap?.players.filter((p) => !p.isEliminated) ?? [];

  return (
    <div className="relative flex h-[100dvh] flex-col bg-[--arena-ink] text-foreground">
      {/* HUD */}
      <header className="flex items-center justify-between gap-3 border-b-2 border-border bg-card/80 px-4 py-2 backdrop-blur">
        <div className="font-head text-lg font-black uppercase">
          Round {snap?.roundNum ?? "—"}
          <span className="ml-2 text-sm text-muted-foreground">{snap?.phase}</span>
        </div>
        {snap && (
          <CountdownRing deadlineEpochMs={snap.deadlineEpochMs} totalMs={10_000} className="size-12" />
        )}
        <div className="flex items-center gap-2 font-head">
          <span aria-hidden>👥</span>
          <span className="text-xl font-black tabular-nums">{alive.length}</span>
        </div>
      </header>

      {/* Surface (plein écran) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">{children}</div>

      {/* Bande joueurs */}
      <footer className="border-t-2 border-border bg-card/80 px-3 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto">
          {snap?.players.map((p: LivePlayer) => (
            <PlayerChip key={p.userId} player={p} />
          ))}
        </div>
      </footer>

      {/* Bandeau reconnexion */}
      <AnimatePresence>
        {(reconnecting || status === "reconnecting") && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute inset-x-0 top-0 z-30 bg-[--arena-danger] px-4 py-2 text-center font-head font-black uppercase text-white"
          >
            Reconnexion en cours… ne quitte pas
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay élimination */}
      <AnimatePresence>
        {eliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-[--arena-ink]/85 backdrop-blur"
          >
            <div className="text-center">
              <p className="font-head text-6xl font-black uppercase text-[--arena-danger]">Éliminé</p>
              <p className="mt-2 text-muted-foreground">Tu peux suivre la suite en mode spectateur.</p>
              <button
                onClick={onReconnect}
                className="mt-4 rounded border-2 border-border bg-primary px-4 py-2 font-head font-bold uppercase"
              >
                Passer en spectateur
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerChip({ player }: { player: LivePlayer }) {
  const initial = player.displayName.slice(0, 2).toUpperCase();
  const bg = player.isEliminated
    ? "var(--arena-danger)"
    : player.connectionStatus !== "CONNECTED"
      ? "var(--muted)"
      : player.submittedAction
        ? "var(--arena-green)"
        : "var(--primary)";
  return (
    <div
      className="flex size-11 shrink-0 flex-col items-center justify-center border-2 border-border font-head text-xs text-white"
      style={{ backgroundColor: bg }}
      title={player.displayName}
      aria-label={`${player.displayName} ${player.isEliminated ? "éliminé" : player.connectionStatus}`}
    >
      {initial}
      {player.connectionStatus !== "CONNECTED" && <span className="text-[10px]">…</span>}
    </div>
  );
}
