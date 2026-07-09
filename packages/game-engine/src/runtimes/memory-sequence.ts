import {
  applyWinnersCount,
  rankPlayers,
  type PlayerAction,
  type RankedPlayer,
  type ResolverOutput,
} from "../index.js";
import type { GameRuntime, RuntimeResolverInput } from "./types.js";

const SEQUENCE_TOKENS = 6;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedToInt(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

function generateFullSequence(seed: string, totalRounds: number, initialLength: number, increment: number): number[][] {
  const rng = mulberry32(seedToInt(seed));
  const fullSequence: number[][] = [];
  for (let r = 0; r < totalRounds; r++) {
    const length = initialLength + r * increment;
    const round: number[] = [];
    for (let i = 0; i < length; i++) {
      round.push(Math.floor(rng() * SEQUENCE_TOKENS));
    }
    fullSequence.push(round);
  }
  return fullSequence;
}

function validateReproduction(expected: number[], reproduction: unknown): boolean {
  if (!Array.isArray(reproduction)) return false;
  if (reproduction.length !== expected.length) return false;
  return reproduction.every((val, i) => val === expected[i]);
}

function latestActionByPlayer(actions: PlayerAction[]): Map<string, PlayerAction> {
  const byPlayer = new Map<string, PlayerAction>();
  for (const action of actions) {
    const existing = byPlayer.get(action.playerId);
    if (!existing || action.submittedAt > existing.submittedAt) {
      byPlayer.set(action.playerId, action);
    }
  }
  return byPlayer;
}

function resolveMemorySequence(input: RuntimeResolverInput): ResolverOutput {
  const config = input.config;
  const initialLength = (config.initialLength as number) ?? 3;
  const increment = (config.increment as number) ?? 1;
  const maxRounds = (config.maxRounds as number) ?? 10;
  const winnersCount = (config.winnersCount as number) ?? 1;
  const displaySpeedMs = (config.displaySpeedMs as number) ?? 600;

  const fullSequence = generateFullSequence(input.seed, maxRounds, initialLength, increment);
  const playerActions = latestActionByPlayer(input.actions);
  const startTime = new Date(input.actions[0]?.submittedAt ?? Date.now()).getTime();

  const entries: Array<Omit<RankedPlayer, "rank">> = input.participants.map((playerId) => {
    const action = playerActions.get(playerId);
    if (!action) {
      return { playerId, score: 0, tieBreakMs: null, missingAction: true };
    }

    const payload = action.payload as Record<string, unknown>;
    const roundIndex = typeof payload.roundIndex === "number" ? payload.roundIndex : 0;
    const reproduction = payload.reproduction;

    const expected = fullSequence[roundIndex];
    const valid = expected ? validateReproduction(expected, reproduction) : false;

    const score = valid ? roundIndex + 1 : roundIndex;
    const reactionMs = valid ? new Date(action.submittedAt).getTime() - startTime : null;
    const tieBreakMs = score > 0 && reactionMs !== null ? reactionMs / score : null;

    return { playerId, score, tieBreakMs, missingAction: false };
  });

  const { ranking, tieGroups } = rankPlayers(entries);
  const { qualifiedIds, eliminatedIds } = applyWinnersCount(ranking, winnersCount);

  return {
    resolverId: "memory-sequence" as never,
    roundId: input.roundId,
    scores: Object.fromEntries(ranking.map((e) => [e.playerId, e.score])),
    ranks: Object.fromEntries(ranking.map((e) => [e.playerId, e.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups,
    ranking,
    evidence: [
      {
        type: "runtime.memory-sequence",
        message: "Score computed server-side from sequence validation",
        data: { maxRounds, initialLength, increment, displaySpeedMs },
      },
    ],
    seedLog: [
      {
        type: "seed.memory-sequence",
        message: "Full sequence generated server-side",
        data: { seed: input.seed, fullSequence },
      },
    ],
  };
}

export const memorySequenceRuntime: GameRuntime = {
  key: "memory-sequence",
  resolve: resolveMemorySequence,
};
