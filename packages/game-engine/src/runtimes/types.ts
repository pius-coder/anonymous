import type { PlayerAction, ResolverOutput } from "../index.js";

export type RuntimeResolverInput = {
  roundId: string;
  participants: string[];
  actions: PlayerAction[];
  config: Record<string, unknown>;
  seed: string;
};

export interface GameRuntime {
  key: string;
  resolve(input: RuntimeResolverInput): ResolverOutput;
}
