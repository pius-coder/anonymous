"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

const DEFAULT_STEPS = ["scan", "align", "lock", "release"];

export function TeamRelayGame({
  steps = DEFAULT_STEPS,
  teams = [],
  youUserId,
  onStep,
  readOnly,
}: {
  steps?: string[];
  teams?: Array<{ userId: string; teamId: string }>;
  youUserId: string;
  onStep: (stepId: string) => void;
  readOnly?: boolean;
}) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const myTeam = teams.find((team) => team.userId === youUserId)?.teamId ?? "red";
  const activeStep = submitted ? Math.min(steps.indexOf(submitted) + 1, steps.length - 1) : 0;

  const submit = (step: string) => {
    if (readOnly || submitted) return;
    setSubmitted(step);
    juice.vibrate("tap");
    onStep(step);
  };

  return (
    <div className="game-surface flex h-full w-full flex-col justify-center gap-5 p-4">
      <div className="text-center">
        <p className="font-head text-3xl font-black uppercase text-[--arena-green]">Relais equipe</p>
        <p className="text-sm text-muted-foreground">
          {readOnly ? "Mode spectateur" : `Equipe ${myTeam.toUpperCase()}`}
        </p>
      </div>
      <div className="mx-auto grid w-full max-w-5xl gap-4">
        {["red", "green"].map((teamId) => (
          <div key={teamId} className="premium-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-head text-xl font-black uppercase">Equipe {teamId}</p>
              <span className="font-mono text-xs text-muted-foreground">
                {teams.filter((team) => team.teamId === teamId).length} joueurs
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => {
                const active = teamId === myTeam && index === activeStep;
                return (
                  <motion.button
                    key={`${teamId}-${step}`}
                    type="button"
                    disabled={readOnly || teamId !== myTeam || !active || Boolean(submitted)}
                    onPointerDown={() => submit(step)}
                    whileTap={{ scale: 0.96 }}
                    className="min-h-24 rounded-xl border border-white/16 p-2 font-head text-sm uppercase shadow-sm transition disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: active ? "var(--arena-gold)" : index < activeStep ? "var(--arena-green)" : "var(--muted)",
                      color: active ? "var(--foreground)" : "white",
                    }}
                  >
                    {index + 1}. {step}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="font-head text-center text-sm text-muted-foreground" aria-live="polite">
        {readOnly ? "Progression synchronisee serveur en lecture seule." : submitted ? "Etape envoyee, attente serveur." : "Valide l'etape active de ton equipe."}
      </p>
    </div>
  );
}
