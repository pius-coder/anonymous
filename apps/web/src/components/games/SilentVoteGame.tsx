"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

export function SilentVoteGame({
  candidates,
  youUserId,
  voteRound,
  role,
  onVote,
  readOnly,
}: {
  candidates: Array<{ userId: string; displayName: string; hasVoted?: boolean }>;
  youUserId: string;
  voteRound: number;
  role?: { role: "IMPOSTOR" | "CITIZEN"; objective: string } | null;
  onVote: (targetUserId: string) => void;
  readOnly?: boolean;
}) {
  const [target, setTarget] = useState<string | null>(null);

  const vote = (targetUserId: string) => {
    if (readOnly || target || targetUserId === youUserId) return;
    setTarget(targetUserId);
    juice.vibrate("tap");
    onVote(targetUserId);
  };

  return (
    <div className="game-surface flex h-full w-full flex-col items-center justify-center gap-5 p-4">
      <div className="text-center">
        <p className="font-head text-3xl font-black uppercase text-[--arena-pink]">Vote silencieux</p>
        <p className="text-sm text-muted-foreground">
          Tour {voteRound} · {readOnly ? "spectateur" : "vote secret"}
        </p>
      </div>
      {!readOnly && role ? (
        <div className={`premium-floating w-full max-w-3xl border px-4 py-3 text-left ${role.role === "IMPOSTOR" ? "border-[--arena-danger]/45 bg-[--arena-danger]/8" : "border-[--arena-cyan]/35 bg-[--arena-cyan]/7"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Rôle privé — ne le partage pas</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className={`font-head text-xl font-black uppercase ${role.role === "IMPOSTOR" ? "text-[--arena-danger]" : "text-[--arena-cyan]"}`}>
              {role.role === "IMPOSTOR" ? "Imposteur" : "Citoyen"}
            </p>
            <p className="max-w-xl text-sm text-white/62">{role.objective}</p>
          </div>
        </div>
      ) : null}
      <div className="relative grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
        {candidates.map((candidate) => {
          const selected = target === candidate.userId;
          const self = candidate.userId === youUserId;
          return (
            <motion.button
              key={candidate.userId}
              type="button"
              disabled={readOnly || Boolean(target) || self}
              whileTap={{ scale: 0.95 }}
              onPointerDown={() => vote(candidate.userId)}
              className="premium-panel min-h-36 p-3 text-center transition hover:-translate-y-0.5 disabled:cursor-not-allowed"
              style={{
                opacity: self ? 0.7 : 1,
                outline: selected ? "2px solid var(--arena-gold)" : undefined,
                boxShadow: selected ? "0 0 0 4px rgb(250 204 21 / 0.15), var(--shadow-floating)" : undefined,
              }}
            >
              <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-white/18 bg-[--arena-ink] font-head text-xl text-white shadow-lg">
                {candidate.displayName.slice(0, 2).toUpperCase()}
              </div>
              <p className="mt-2 truncate font-head text-sm uppercase">{candidate.displayName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {self ? "toi" : candidate.hasVoted ? "a voté" : selected ? "cible choisie" : "en attente"}
              </p>
            </motion.button>
          );
        })}
      </div>
      <p className="max-w-xl text-center font-head text-sm text-muted-foreground" aria-live="polite">
        {readOnly ? "Les votes restent masqués jusqu’à la résolution serveur." : target ? "Vote envoyé. Rien n’est révélé avant la resolution." : "Choisis un joueur. Ton vote est unique et borné par nonce."}
      </p>
    </div>
  );
}
