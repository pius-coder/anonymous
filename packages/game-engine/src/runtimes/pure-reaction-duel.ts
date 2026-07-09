import {
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

function generateSignalTimings(
  seed: string,
  maxSubRounds: number,
  delayRangeMs: [number, number],
): number[] {
  const rng = mulberry32(seedToInt(seed));
  const timings: number[] = [];
  for (let i = 0; i < maxSubRounds; i++) {
    const delay = Math.floor(rng() * (delayRangeMs[1] - delayRangeMs[0] + 1)) + delayRangeMs[0];
    timings.push(delay);
  }
  return timings;
}

function resolvePureReactionDuel(input: RuntimeResolverInput): ResolverOutput {
  if (input.participants.length !== 2) {
    throw new Error("pure-reaction-duel requires exactly two participants");
  }

  const config = input.config;
  const roundsToWin = (config.roundsToWin as number) ?? 2;
  const falseStartPenaltyMs = (config.falseStartPenaltyMs as number) ?? 1000;
  const delayRangeMs: [number, number] = Array.isArray(config.signalDelayRangeMs)
    ? (config.signalDelayRangeMs as [number, number])
    : [2000, 6000];

  const maxSubRounds = roundsToWin * 2 + 1;
  const signalTimings = generateSignalTimings(input.seed, maxSubRounds, delayRangeMs);

  const actionsByPlayer = new Map<string, PlayerAction[]>();
  for (const action of input.actions) {
    const list = actionsByPlayer.get(action.playerId) ?? [];
    list.push(action);
    actionsByPlayer.set(action.playerId, list);
  }

  const [p1, p2] = input.participants;
  const p1Actions = (actionsByPlayer.get(p1) ?? []).sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
  const p2Actions = (actionsByPlayer.get(p2) ?? []).sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );

  let p1Wins = 0;
  let p2Wins = 0;
  const p1ReactionTimes: number[] = [];
  const p2ReactionTimes: number[] = [];
  const evidence: ResolverOutput["evidence"] = [];
  let subRound = 0;

  for (
    let i = 0;
    i < maxSubRounds && p1Wins < roundsToWin && p2Wins < roundsToWin;
    i++, subRound++
  ) {
    const p1Click = p1Actions[i];
    const p2Click = p2Actions[i];

    const p1Payload = p1Click ? (p1Click.payload as Record<string, unknown>) : null;
    const p2Payload = p2Click ? (p2Click.payload as Record<string, unknown>) : null;
    const p1ClickedAtMs = typeof p1Payload?.clickedAtMs === "number" ? p1Payload.clickedAtMs : Infinity;
    const p2ClickedAtMs = typeof p2Payload?.clickedAtMs === "number" ? p2Payload.clickedAtMs : Infinity;

    const p1FalseStart = p1ClickedAtMs < signalTimings[i];
    const p2FalseStart = p2ClickedAtMs < signalTimings[i];

    if (p1FalseStart && !p2FalseStart) {
      p2Wins++;
      evidence.push({
        type: "false-start",
        message: `${p1} false start on sub-round ${i}`,
        data: { player: p1, subRound: i, signalMs: signalTimings[i], clickedAtMs: p1ClickedAtMs },
      });
    } else if (p2FalseStart && !p1FalseStart) {
      p1Wins++;
      evidence.push({
        type: "false-start",
        message: `${p2} false start on sub-round ${i}`,
        data: { player: p2, subRound: i, signalMs: signalTimings[i], clickedAtMs: p2ClickedAtMs },
      });
    } else if (p1FalseStart && p2FalseStart) {
      evidence.push({
        type: "both-false-start",
        message: `Both false start on sub-round ${i}`,
        data: { subRound: i },
      });
    } else {
      const p1Reaction = p1ClickedAtMs - signalTimings[i];
      const p2Reaction = p2ClickedAtMs - signalTimings[i];
      p1ReactionTimes.push(p1Reaction);
      p2ReactionTimes.push(p2Reaction);

      if (p1Reaction < p2Reaction) {
        p1Wins++;
      } else if (p2Reaction < p1Reaction) {
        p2Wins++;
      } else {
        evidence.push({
          type: "tie-subround",
          message: `Tie on sub-round ${i}`,
          data: { subRound: i, p1Reaction, p2Reaction },
        });
      }
    }
  }

  const p1AvgReaction =
    p1ReactionTimes.length > 0
      ? p1ReactionTimes.reduce((s, t) => s + t, 0) / p1ReactionTimes.length
      : null;
  const p2AvgReaction =
    p2ReactionTimes.length > 0
      ? p2ReactionTimes.reduce((s, t) => s + t, 0) / p2ReactionTimes.length
      : null;

  const entries: Array<Omit<RankedPlayer, "rank">> = [
    { playerId: p1, score: p1Wins, tieBreakMs: p1AvgReaction, missingAction: false },
    { playerId: p2, score: p2Wins, tieBreakMs: p2AvgReaction, missingAction: false },
  ];

  const { ranking, tieGroups } = rankPlayers(entries);
  const qualifiedIds = [ranking[0].playerId];
  const eliminatedIds = ranking.slice(1).map((e) => e.playerId);

  return {
    resolverId: "pure-reaction-duel" as never,
    roundId: input.roundId,
    scores: Object.fromEntries(ranking.map((e) => [e.playerId, e.score])),
    ranks: Object.fromEntries(ranking.map((e) => [e.playerId, e.rank])),
    qualifiedIds,
    eliminatedIds,
    tieGroups,
    ranking,
    evidence: [
      {
        type: "runtime.pure-reaction-duel",
        message: "Duel resolved server-side with signal timestamps",
        data: { roundsToWin, falseStartPenaltyMs, subRoundsPlayed: subRound },
      },
      ...evidence,
    ],
    seedLog: [
      {
        type: "seed.pure-reaction-duel",
        message: "Signal timings generated server-side",
        data: { seed: input.seed, signalTimings: signalTimings.slice(0, subRound) },
      },
    ],
  };
}

export const pureReactionDuelRuntime: GameRuntime = {
  key: "pure-reaction-duel",
  resolve: resolvePureReactionDuel,
};
