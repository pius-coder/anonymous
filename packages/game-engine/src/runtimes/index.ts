import type { GameRuntime } from "./types.js";
import { memorySequenceRuntime } from "./memory-sequence.js";
import { rapidCalculationRuntime } from "./rapid-calculation.js";
import { pureReactionDuelRuntime } from "./pure-reaction-duel.js";

export const RUNTIMES: Record<string, GameRuntime> = {
  [memorySequenceRuntime.key]: memorySequenceRuntime,
  [rapidCalculationRuntime.key]: rapidCalculationRuntime,
  [pureReactionDuelRuntime.key]: pureReactionDuelRuntime,
};

export function getRuntime(key: string): GameRuntime | undefined {
  return RUNTIMES[key];
}

export type { GameRuntime, RuntimeResolverInput } from "./types.js";
