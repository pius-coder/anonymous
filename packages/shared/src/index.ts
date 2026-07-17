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
/** Dual-credential Fapshi HTTP client (collection + payout). */
export * from "./payments/fapshi-client.js";
/** Pure collection helpers (no I/O). Omit types that clash with fapshi-client. */
export {
  FAPSHI_PROVIDER,
  FAPSHI_MIN_AMOUNT_XAF,
  FAPSHI_ALLOWED_BASE_URLS,
  FAPSHI_DEFAULT_CHECKOUT_HOSTS,
  FAPSHI_WIRE_STATUSES,
  isFapshiWireStatus,
  hasVerifiedFapshiSuccessAmount,
  isAllowedFapshiBaseUrl,
  isAllowedCheckoutHost,
  assertCheckoutLinkAllowed,
  assertTransId,
  assertExternalId,
  mapFapshiWireToPaymentStatus,
  fapshiWebhookEventKey,
  redactFapshiSecrets,
} from "./payments/fapshi.js";
