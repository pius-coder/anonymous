"use client";

import { useCallback, useEffect, useReducer } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

const TILES = [
  { id: 0, color: "var(--arena-pink)", label: "Rose" },
  { id: 1, color: "var(--arena-teal)", label: "Teal" },
  { id: 2, color: "var(--arena-gold)", label: "Or" },
  { id: 3, color: "var(--arena-green)", label: "Vert" },
] as const;

type Phase = "IDLE" | "WATCH" | "INPUT" | "SENT" | "FAILED";

type Props = {
  incomingSequence: number[] | null;
  onSubmit: (steps: number[]) => void;
  level: number;
  showSpeedMs?: number;
  readOnly?: boolean;
};

type State = {
  phase: Phase;
  litTile: number | null;
  input: number[];
  seqLen: number;
};

type Action =
  | { type: "NEW_SEQUENCE"; steps: number[] }
  | { type: "LIT_TILE"; tileId: number | null }
  | { type: "PHASE"; phase: Phase }
  | { type: "PRESS"; tileId: number };

function gameReducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEW_SEQUENCE":
      return { ...state, phase: "WATCH", input: [], seqLen: action.steps.length, litTile: null };
    case "LIT_TILE":
      return { ...state, litTile: action.tileId };
    case "PHASE":
      return { ...state, phase: action.phase };
    case "PRESS": {
      if (state.phase !== "INPUT") return state;
      const next = [...state.input, action.tileId];
      return { ...state, input: next, phase: next.length === state.seqLen ? "SENT" : state.phase };
    }
    default:
      return state;
  }
}

export function MemorySequenceGame({ incomingSequence, onSubmit, level, showSpeedMs = 600, readOnly }: Props) {
  const [state, dispatch] = useReducer(gameReducer, { phase: "IDLE", litTile: null, input: [], seqLen: 0 });
  const { phase, litTile, input, seqLen } = state;

  useEffect(() => {
    if (!incomingSequence) return;
    dispatch({ type: "NEW_SEQUENCE", steps: incomingSequence });
    let i = 0;
    const play = () => {
      if (i >= incomingSequence.length) {
        dispatch({ type: "LIT_TILE", tileId: null });
        dispatch({ type: "PHASE", phase: readOnly ? "IDLE" : "INPUT" });
        return;
      }
      dispatch({ type: "LIT_TILE", tileId: incomingSequence[i] });
      juice.play("countdown_tick");
      setTimeout(() => {
        dispatch({ type: "LIT_TILE", tileId: null });
        i += 1;
        setTimeout(play, 160);
      }, showSpeedMs);
    };
    const t = setTimeout(play, 500);
    return () => clearTimeout(t);
  }, [incomingSequence, showSpeedMs, readOnly]);

  useEffect(() => {
    if (phase === "SENT") onSubmit(input);
  }, [phase, input, onSubmit]);

  const press = useCallback(
    (tileId: number) => {
      if (phase !== "INPUT" || readOnly) return;
      juice.vibrate("tap");
      dispatch({ type: "PRESS", tileId });
      dispatch({ type: "LIT_TILE", tileId });
      setTimeout(() => dispatch({ type: "LIT_TILE", tileId: null }), 180);
    },
    [phase, readOnly],
  );

  return (
    <div className="game-surface flex h-full min-h-0 flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-4">
        <span className="font-head text-lg text-muted-foreground">NIVEAU</span>
        <span className="font-head text-4xl text-[--arena-gold]">{level}</span>
      </div>

      <p className="font-head text-xl tracking-wide text-center" aria-live="polite">
        {phase === "WATCH" && <span className="text-[--arena-teal]">👁 REGARDE…</span>}
        {phase === "INPUT" && (
          <span className="text-[--arena-pink]">✋ REPRODUIS ({input.length}/{seqLen})</span>
        )}
        {phase === "SENT" && <span className="text-muted-foreground">VÉRIFICATION…</span>}
        {phase === "FAILED" && <span className="text-[--arena-danger]">RATÉ !</span>}
        {phase === "IDLE" && <span className="text-muted-foreground">EN ATTENTE DU SERVEUR…</span>}
      </p>

      <div className="grid w-full max-w-[min(90vw,420px)] grid-cols-2 gap-3 md:gap-4 aspect-square">
        {TILES.map((tile) => {
          const lit = litTile === tile.id;
          return (
            <motion.button
              key={tile.id}
              type="button"
              aria-label={tile.label}
              disabled={phase !== "INPUT" || readOnly}
              onPointerDown={() => press(tile.id)}
              whileTap={{ scale: 0.94 }}
              className="border-4 border-border shadow-md select-none touch-manipulation disabled:cursor-not-allowed"
              style={{
                backgroundColor: tile.color,
                filter: lit
                  ? "brightness(1.6) saturate(1.3)"
                  : phase === "WATCH"
                    ? "brightness(0.45)"
                    : "brightness(0.85)",
                boxShadow: lit ? `0 0 32px ${tile.color}` : undefined,
                transition: "filter 120ms, box-shadow 120ms",
              }}
            />
          );
        })}
      </div>

      <div className="flex gap-2 h-3">
        {Array.from({ length: seqLen }).map((_, i) => (
          <div
            key={i}
            className="size-3 border-2 border-border"
            style={{ backgroundColor: i < input.length ? "var(--arena-green)" : "var(--muted)" }}
          />
        ))}
      </div>
    </div>
  );
}
