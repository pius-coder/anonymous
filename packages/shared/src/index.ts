export const FOUNDATION_VERSION = "v0.1" as const;

export type FoundationBoundary =
  | "domain"
  | "contracts"
  | "transports"
  | "realtime"
  | "persistence"
  | "admin-web"
  | "player-web"
  | "notifications"
  | "observability";

export const FOUNDATION_BOUNDARIES: readonly FoundationBoundary[] = [
  "domain",
  "contracts",
  "transports",
  "realtime",
  "persistence",
  "admin-web",
  "player-web",
  "notifications",
  "observability",
] as const;

export * from "./auth/errors.js";
export * from "./auth/tokens.js";
export * from "./payments/errors.js";
export * from "./payments/fapshi-client.js";
