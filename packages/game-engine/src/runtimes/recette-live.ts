import {
  applyWinnersCount,
  rankPlayers,
  type PlayerAction,
  type RankedPlayer,
  type ResolverOutput,
} from "../index.js";
import type { GameRuntime, RuntimeResolverInput } from "./types.js";

const TRUST_ROUTES = new Set(["alpha", "beta", "gamma"]);
const RELAY_STEPS = ["scan", "align", "lock", "release"];
const ARENA = { width: 1000, height: 700 };
const DEFAULT_SWEEP = { speed: 180, width: 72 };

function submittedAtMs(action: PlayerAction) {
  return new Date(action.submittedAt).getTime();
}

function latestActionByPlayer(actions: PlayerAction[]) {
  const byPlayer = new Map<string, PlayerAction>();
  for (const action of actions) {
    const current = byPlayer.get(action.playerId);
    if (!current || action.submittedAt > current.submittedAt) {
      byPlayer.set(action.playerId, action);
    }
  }
  return byPlayer;
}

function orderedActions(actions: PlayerAction[]) {
  return [...actions].sort((a, b) => {
    const delta = submittedAtMs(a) - submittedAtMs(b);
    return delta !== 0 ? delta : `${a.playerId}:${a.actionNonce}`.localeCompare(`${b.playerId}:${b.actionNonce}`);
  });
}

function scoresToOutput(input: {
  resolverId: string;
  roundId: string;
  entries: Array<Omit<RankedPlayer, "rank">>;
  winnersCount: number;
  evidence: ResolverOutput["evidence"];
  seedLog?: ResolverOutput["seedLog"];
}): ResolverOutput {
  const { ranking, tieGroups } = rankPlayers(input.entries);
  const { qualifiedIds, eliminatedIds } = applyWinnersCount(ranking, input.winnersCount);
  return {
    resolverId: input.resolverId as never,
    roundId: input.roundId,
    scores: Object.fromEntries(ranking.map((entry) => [entry.playerId, entry.score])),
    ranks: Object.fromEntries(ranking.map((entry) => [entry.playerId, entry.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups,
    ranking,
    evidence: input.evidence,
    seedLog: input.seedLog ?? [],
  };
}

function resolveTrustBridge(input: RuntimeResolverInput): ResolverOutput {
  const winnersCount = (input.config.winnersCount as number) ?? Math.ceil(input.participants.length / 2);
  const latest = latestActionByPlayer(input.actions);
  const pairRouteCounts = new Map<string, Map<string, number>>();

  input.participants.forEach((playerId, index) => {
    const pairId = `pair-${Math.floor(index / 2) + 1}`;
    const action = latest.get(playerId);
    const routeId = action?.payload.routeId;
    if (typeof routeId !== "string" || !TRUST_ROUTES.has(routeId)) return;
    const counts = pairRouteCounts.get(pairId) ?? new Map<string, number>();
    counts.set(routeId, (counts.get(routeId) ?? 0) + 1);
    pairRouteCounts.set(pairId, counts);
  });

  const entries: Array<Omit<RankedPlayer, "rank">> = input.participants.map((playerId, index) => {
    const pairId = `pair-${Math.floor(index / 2) + 1}`;
    const action = latest.get(playerId);
    const routeId = action?.payload.routeId;
    if (typeof routeId !== "string" || !TRUST_ROUTES.has(routeId)) {
      return { playerId, score: 0, tieBreakMs: null, missingAction: true };
    }
    const pairAgreement = pairRouteCounts.get(pairId)?.get(routeId) ?? 0;
    return {
      playerId,
      score: pairAgreement >= 2 ? 100 : 35,
      tieBreakMs: action ? submittedAtMs(action) : null,
      missingAction: false,
    };
  });

  return scoresToOutput({
    resolverId: "trust-bridge",
    roundId: input.roundId,
    entries,
    winnersCount,
    evidence: [
      {
        type: "runtime.trust-bridge",
        message: "Pairs score only when both players choose the same server-known route",
        data: { routes: [...TRUST_ROUTES], winnersCount },
      },
    ],
  });
}

function resolveTeamRelay(input: RuntimeResolverInput): ResolverOutput {
  const winnersCount = (input.config.winnersCount as number) ?? Math.ceil(input.participants.length / 2);
  const teamByPlayer = new Map(input.participants.map((playerId, index) => [playerId, index % 2 === 0 ? "red" : "green"]));
  const progressByTeam = new Map<string, { nextIndex: number; completedAtMs: number | null }>([
    ["red", { nextIndex: 0, completedAtMs: null }],
    ["green", { nextIndex: 0, completedAtMs: null }],
  ]);

  for (const action of orderedActions(input.actions)) {
    const teamId = teamByPlayer.get(action.playerId);
    if (!teamId) continue;
    const progress = progressByTeam.get(teamId);
    const stepId = action.payload.stepId;
    if (!progress || typeof stepId !== "string") continue;
    if (RELAY_STEPS[progress.nextIndex] === stepId) {
      progress.nextIndex += 1;
      if (progress.nextIndex >= RELAY_STEPS.length && progress.completedAtMs === null) {
        progress.completedAtMs = submittedAtMs(action);
      }
    }
  }

  const entries: Array<Omit<RankedPlayer, "rank">> = input.participants.map((playerId) => {
    const teamId = teamByPlayer.get(playerId) ?? "red";
    const progress = progressByTeam.get(teamId) ?? { nextIndex: 0, completedAtMs: null };
    const hasAction = input.actions.some((action) => action.playerId === playerId);
    return {
      playerId,
      score: progress.nextIndex,
      tieBreakMs: progress.completedAtMs,
      missingAction: !hasAction,
    };
  });

  return scoresToOutput({
    resolverId: "team-relay",
    roundId: input.roundId,
    entries,
    winnersCount,
    evidence: [
      {
        type: "runtime.team-relay",
        message: "Team progress is advanced only by the expected step sequence",
        data: { steps: RELAY_STEPS, progress: Object.fromEntries(progressByTeam) },
      },
    ],
  });
}

function sweepX(input: RuntimeResolverInput, atMs: number) {
  const t0EpochMs = (input.config.sweepT0EpochMs as number) ?? 0;
  const speed = (input.config.speed as number) ?? DEFAULT_SWEEP.speed;
  const width = (input.config.width as number) ?? DEFAULT_SWEEP.width;
  const elapsed = Math.max(0, atMs - t0EpochMs) / 1000;
  return ((elapsed * speed) % (ARENA.width + width * 2)) - width;
}

function resolveDangerSweep(input: RuntimeResolverInput): ResolverOutput {
  const winnersCount = (input.config.winnersCount as number) ?? Math.ceil(input.participants.length / 2);
  const latest = latestActionByPlayer(input.actions);
  const beamWidth = (input.config.width as number) ?? DEFAULT_SWEEP.width;

  const entries: Array<Omit<RankedPlayer, "rank">> = input.participants.map((playerId, index) => {
    const action = latest.get(playerId);
    if (!action) return { playerId, score: 0, tieBreakMs: null, missingAction: true };
    const x = typeof action.payload.x === "number" ? action.payload.x : 160 + (index % 5) * 130;
    const y = typeof action.payload.y === "number" ? action.payload.y : 160 + Math.floor(index / 5) * 110;
    const inArena = x >= 0 && x <= ARENA.width && y >= 0 && y <= ARENA.height;
    const rayX = sweepX(input, submittedAtMs(action));
    const hit = inArena && x >= rayX && x <= rayX + beamWidth;
    const centerDistance = Math.abs(x - (rayX + beamWidth / 2));
    return {
      playerId,
      score: inArena && !hit ? Math.max(1, Math.round(centerDistance)) : 0,
      tieBreakMs: submittedAtMs(action),
      missingAction: false,
    };
  });

  return scoresToOutput({
    resolverId: "danger-sweep",
    roundId: input.roundId,
    entries,
    winnersCount,
    evidence: [
      {
        type: "runtime.danger-sweep",
        message: "Sweep collision is recomputed server-side from deterministic beam position",
        data: { arena: ARENA, beamWidth, winnersCount },
      },
    ],
  });
}

function resolveSilentVote(input: RuntimeResolverInput): ResolverOutput {
  const latest = latestActionByPlayer(input.actions);
  const votes = new Map<string, string>();
  for (const playerId of input.participants) {
    const targetUserId = latest.get(playerId)?.payload.targetUserId;
    if (
      typeof targetUserId === "string" &&
      targetUserId !== playerId &&
      input.participants.includes(targetUserId)
    ) {
      votes.set(playerId, targetUserId);
    }
  }

  const voteCounts = new Map<string, number>();
  for (const targetUserId of votes.values()) {
    voteCounts.set(targetUserId, (voteCounts.get(targetUserId) ?? 0) + 1);
  }
  const eliminatedTarget = [...voteCounts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0]?.[0] ?? null;

  const ranking = input.participants.map((playerId) => ({
    playerId,
    score: eliminatedTarget && playerId !== eliminatedTarget ? 1 : 0,
    tieBreakMs: votes.has(playerId) ? submittedAtMs(latest.get(playerId) as PlayerAction) : null,
    missingAction: !votes.has(playerId),
  }));
  const ranked = rankPlayers(ranking);
  const qualifiedIds = eliminatedTarget
    ? input.participants.filter((playerId) => playerId !== eliminatedTarget)
    : input.participants;
  const eliminatedIds = eliminatedTarget ? [eliminatedTarget] : [];

  return {
    resolverId: "silent-vote" as never,
    roundId: input.roundId,
    scores: Object.fromEntries(ranked.ranking.map((entry) => [entry.playerId, entry.score])),
    ranks: Object.fromEntries(ranked.ranking.map((entry) => [entry.playerId, entry.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups: ranked.tieGroups,
    ranking: ranked.ranking,
    evidence: [
      {
        type: "runtime.silent-vote",
        message: "Majority target is eliminated with deterministic tie-break by user id",
        data: { voteCounts: Object.fromEntries(voteCounts), eliminatedTarget },
      },
    ],
    seedLog: [],
  };
}

export const trustBridgeRuntime: GameRuntime = {
  key: "trust-bridge",
  resolve: resolveTrustBridge,
};

export const teamRelayRuntime: GameRuntime = {
  key: "team-relay",
  resolve: resolveTeamRelay,
};

export const dangerSweepRuntime: GameRuntime = {
  key: "danger-sweep",
  resolve: resolveDangerSweep,
};

export const silentVoteRuntime: GameRuntime = {
  key: "silent-vote",
  resolve: resolveSilentVote,
};
