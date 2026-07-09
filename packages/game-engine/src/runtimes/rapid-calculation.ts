import {
  applyWinnersCount,
  rankPlayers,
  type PlayerAction,
  type RankedPlayer,
  type ResolverOutput,
} from "../index.js";
import type { GameRuntime, RuntimeResolverInput } from "./types.js";

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

type Question = { a: number; b: number; op: "+" | "-"; answer: number };

function generateQuestions(seed: string, count: number, difficultyMin: number, difficultyMax: number): Question[] {
  const rng = mulberry32(seedToInt(seed));
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const op: "+" | "-" = rng() > 0.5 ? "+" : "-";
    const a = Math.floor(rng() * (difficultyMax - difficultyMin + 1)) + difficultyMin;
    const bMax = op === "-" ? a : difficultyMax;
    const b = Math.floor(rng() * (bMax - difficultyMin + 1)) + difficultyMin;
    questions.push({ a, b, op, answer: op === "+" ? a + b : a - b });
  }
  return questions;
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

function resolveRapidCalculation(input: RuntimeResolverInput): ResolverOutput {
  const config = input.config;
  const difficultyMin = (config.difficultyMin as number) ?? 10;
  const difficultyMax = (config.difficultyMax as number) ?? 99;
  const winnersCount = (config.winnersCount as number) ?? 1;
  const questionDelayMs = (config.questionDelayMs as number) ?? 5000;

  const totalQuestions = Math.max(input.actions.length, 30);
  const questions = generateQuestions(input.seed, totalQuestions, difficultyMin, difficultyMax);
  const playerActions = latestActionByPlayer(input.actions);

  const entries: Array<Omit<RankedPlayer, "rank">> = input.participants.map((playerId) => {
    const action = playerActions.get(playerId);
    if (!action) {
      return { playerId, score: 0, tieBreakMs: null, missingAction: true };
    }

    const payload = action.payload as Record<string, unknown>;
    const questionIndex = typeof payload.questionIndex === "number" ? payload.questionIndex : 0;
    const playerAnswer = typeof payload.answer === "number" ? payload.answer : null;
    const answeredAtMs = typeof payload.answeredAtMs === "number" ? payload.answeredAtMs : null;

    const question = questions[questionIndex];
    const correct = question && playerAnswer === question.answer;
    const score = correct ? 1 : 0;
    const tieBreakMs = correct && answeredAtMs !== null ? answeredAtMs : null;

    return { playerId, score, tieBreakMs, missingAction: false };
  });

  const { ranking, tieGroups } = rankPlayers(entries);
  const { qualifiedIds, eliminatedIds } = applyWinnersCount(ranking, winnersCount);

  return {
    resolverId: "rapid-calculation" as never,
    roundId: input.roundId,
    scores: Object.fromEntries(ranking.map((e) => [e.playerId, e.score])),
    ranks: Object.fromEntries(ranking.map((e) => [e.playerId, e.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups,
    ranking,
    evidence: [
      {
        type: "runtime.rapid-calculation",
        message: "Score computed server-side from answer validation",
        data: { totalQuestions: questions.length, difficultyMin, difficultyMax, questionDelayMs },
      },
    ],
    seedLog: [
      {
        type: "seed.rapid-calculation",
        message: "Questions generated server-side from seed",
        data: { seed: input.seed, questionCount: questions.length },
      },
    ],
  };
}

export const rapidCalculationRuntime: GameRuntime = {
  key: "rapid-calculation",
  resolve: resolveRapidCalculation,
};
