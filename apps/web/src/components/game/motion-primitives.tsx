"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { getCountdownState } from "./motion-utils";

export function PhaseTransition({ phase, children }: { phase: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={phase}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.22 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function CountdownRing({
  deadlineEpochMs,
  totalMs,
  nowEpochMs,
  label = "Temps restant",
  className,
}: {
  deadlineEpochMs: number;
  totalMs: number;
  nowEpochMs?: number;
  label?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => nowEpochMs ?? Date.now());
  const effectiveNow = nowEpochMs ?? now;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (nowEpochMs !== undefined) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [nowEpochMs]);

  const state = useMemo(
    () => getCountdownState({ deadlineEpochMs, nowEpochMs: effectiveNow, totalMs }),
    [deadlineEpochMs, effectiveNow, totalMs],
  );
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - state.progress);

  return (
    <div className={cn("relative inline-grid size-28 place-items-center", className)} aria-label={label}>
      <svg viewBox="0 0 112 112" className="size-full -rotate-90">
        <circle cx="56" cy="56" r={radius} fill="#fff7e8" stroke="#000" strokeWidth="8" />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          fill="transparent"
          stroke={state.isExpired ? "#e63946" : "#ffdc58"}
          strokeWidth="10"
          strokeLinecap="square"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        />
      </svg>
      <span className="absolute font-mono text-xl font-black tabular-nums text-foreground">
        {state.seconds}s
      </span>
    </div>
  );
}

export function EliminationOverlay({
  visible,
  playerName,
}: {
  visible: boolean;
  playerName: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-6 text-background"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
        >
          <motion.div
            className="border-2 border-border bg-destructive px-8 py-6 text-center text-destructive-foreground shadow-2xl"
            initial={reduceMotion ? { scale: 1 } : { scale: 0.9, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
          >
            <p className="font-head text-4xl font-black uppercase">Elimine</p>
            <p className="mt-2 font-mono text-sm">{playerName}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ScorePop({
  value,
  label = "Score",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={cn(
        "inline-flex items-center border-2 border-border bg-primary px-3 py-1 font-mono text-sm font-black text-primary-foreground shadow-md",
        className,
      )}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      aria-label={`${label} ${value}`}
    >
      +{value.toLocaleString("fr-FR")}
    </motion.span>
  );
}
