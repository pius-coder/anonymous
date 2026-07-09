"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

export function SilentVoteGame({
  candidates,
  youUserId,
  voteRound,
  onVote,
  readOnly,
}: {
  candidates: Array<{ userId: string; displayName: string; hasVoted?: boolean }>;
  youUserId: string;
  voteRound: number;
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
              className="min-h-36 border-4 border-border bg-card p-3 text-center disabled:cursor-not-allowed"
              style={{
                opacity: self ? 0.7 : 1,
                outline: selected ? "4px solid var(--arena-gold)" : undefined,
              }}
            >
              <div className="mx-auto grid size-16 place-items-center border-4 border-border bg-[--arena-ink] font-head text-xl text-white">
                {candidate.displayName.slice(0, 2).toUpperCase()}
              </div>
              <p className="mt-2 truncate font-head text-sm uppercase">{candidate.displayName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {self ? "toi" : candidate.hasVoted ? "a vote" : selected ? "cible choisie" : "en attente"}
              </p>
            </motion.button>
          );
        })}
      </div>
      <p className="max-w-xl text-center font-head text-sm text-muted-foreground" aria-live="polite">
        {readOnly ? "Les votes restent masques jusqu'a la resolution serveur." : target ? "Vote envoye. Rien n'est revele avant la resolution." : "Choisis un joueur. Ton vote est unique et borne par nonce."}
      </p>
    </div>
  );
}
