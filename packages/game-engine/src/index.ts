import { createHash } from "node:crypto";

export const GAME_ENGINE_VERSION = "0.1.0";

export type ResolverFamily = "solo-score" | "duel-score";

export type PlayerAction = {
  playerId: string;
  actionNonce: string;
  submittedAt: string;
  payload: {
    score?: number;
    tieBreakMs?: number;
    [key: string]: unknown;
  };
};

export type ResolverConfig = {
  family: ResolverFamily;
  winnersCount: number;
  missingActionScore?: number;
};

export type ResolverInput = {
  roundId: string;
  participants: string[];
  actions: PlayerAction[];
  config: ResolverConfig;
  seedLog?: ResolutionEvidence[];
};

export type RankedPlayer = {
  playerId: string;
  score: number;
  rank: number;
  tieBreakMs: number | null;
  missingAction: boolean;
};

export type ResolutionEvidence = {
  type: string;
  message: string;
  data?: Record<string, unknown>;
};

export type ResolverOutput = {
  resolverId: ResolverFamily;
  roundId: string;
  scores: Record<string, number>;
  ranks: Record<string, number>;
  qualifiedIds: string[];
  eliminatedIds: string[];
  tieGroups: string[][];
  ranking: RankedPlayer[];
  evidence: ResolutionEvidence[];
  seedLog: ResolutionEvidence[];
};

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function hashResolution(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("base64url");
}

export function rankPlayers(
  entries: Array<Omit<RankedPlayer, "rank">>,
): { ranking: RankedPlayer[]; tieGroups: string[][] } {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.tieBreakMs !== null && b.tieBreakMs !== null && a.tieBreakMs !== b.tieBreakMs) {
      return a.tieBreakMs - b.tieBreakMs;
    }
    if (a.tieBreakMs !== null && b.tieBreakMs === null) return -1;
    if (a.tieBreakMs === null && b.tieBreakMs !== null) return 1;
    return a.playerId.localeCompare(b.playerId);
  });

  const ranking = sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  const tieGroups = new Map<string, string[]>();
  for (const entry of ranking) {
    const key = `${entry.score}:${entry.tieBreakMs ?? "none"}`;
    const group = tieGroups.get(key) ?? [];
    group.push(entry.playerId);
    tieGroups.set(key, group);
  }

  return {
    ranking,
    tieGroups: [...tieGroups.values()].filter((group) => group.length > 1),
  };
}

export function applyWinnersCount(ranking: RankedPlayer[], winnersCount: number) {
  const safeWinnersCount = Math.max(0, Math.min(winnersCount, ranking.length));
  const qualifiedIds = ranking.slice(0, safeWinnersCount).map((entry) => entry.playerId);
  const qualified = new Set(qualifiedIds);
  return {
    qualifiedIds,
    eliminatedIds: ranking
      .filter((entry) => !qualified.has(entry.playerId))
      .map((entry) => entry.playerId),
  };
}

function latestActionByPlayer(actions: PlayerAction[]) {
  const byPlayer = new Map<string, PlayerAction>();
  for (const action of actions) {
    const existing = byPlayer.get(action.playerId);
    if (!existing || action.submittedAt > existing.submittedAt) {
      byPlayer.set(action.playerId, action);
    }
  }
  return byPlayer;
}

function resolveScoreRound(input: ResolverInput, resolverId: ResolverFamily): ResolverOutput {
  const evidence: ResolutionEvidence[] = [
    {
      type: "resolver.selected",
      message: `${resolverId} resolver selected`,
      data: { winnersCount: input.config.winnersCount },
    },
  ];
  const actions = latestActionByPlayer(input.actions);
  const missingActionScore = input.config.missingActionScore ?? 0;

  const entries = input.participants.map((playerId) => {
    const action = actions.get(playerId);
    const score = typeof action?.payload.score === "number" ? action.payload.score : missingActionScore;
    const tieBreakMs =
      typeof action?.payload.tieBreakMs === "number" ? action.payload.tieBreakMs : null;
    const missingAction = !action;
    if (missingAction) {
      evidence.push({
        type: "action.missing",
        message: "Missing action scored with default",
        data: { playerId, score },
      });
    }
    return { playerId, score, tieBreakMs, missingAction };
  });

  const { ranking, tieGroups } = rankPlayers(entries);
  const { qualifiedIds, eliminatedIds } = applyWinnersCount(
    ranking,
    resolverId === "duel-score" ? Math.min(1, input.config.winnersCount) : input.config.winnersCount,
  );

  return {
    resolverId,
    roundId: input.roundId,
    scores: Object.fromEntries(ranking.map((entry) => [entry.playerId, entry.score])),
    ranks: Object.fromEntries(ranking.map((entry) => [entry.playerId, entry.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups,
    ranking,
    evidence,
    seedLog: input.seedLog ?? [],
  };
}

export function resolveSoloScoreRound(input: ResolverInput) {
  return resolveScoreRound(input, "solo-score");
}

export function resolveDuelScoreRound(input: ResolverInput) {
  if (input.participants.length !== 2) {
    throw new Error("duel-score resolver requires exactly two participants");
  }
  return resolveScoreRound(input, "duel-score");
}

export function resolveRound(input: ResolverInput) {
  if (input.config.family === "solo-score") return resolveSoloScoreRound(input);
  if (input.config.family === "duel-score") return resolveDuelScoreRound(input);
  throw new Error(`Unsupported resolver family: ${input.config.family}`);
}
