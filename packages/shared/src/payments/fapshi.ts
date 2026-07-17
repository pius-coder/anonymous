/**
 * Pure Fapshi collection helpers (no I/O, no secrets).
 * Official wire statuses: CREATED | PENDING | SUCCESSFUL | FAILED | EXPIRED.
 */

export const FAPSHI_PROVIDER = "FAPSHI" as const;
export const FAPSHI_MIN_AMOUNT_XAF = 100;

export const FAPSHI_ALLOWED_BASE_URLS = [
  "https://sandbox.fapshi.com",
  "https://live.fapshi.com",
] as const;

/** Hosts allowed for hosted checkout `link` returned by initiate-pay. */
export const FAPSHI_DEFAULT_CHECKOUT_HOSTS = [
  "sandbox.fapshi.com",
  "live.fapshi.com",
  "fapshi.com",
  "www.fapshi.com",
] as const;

export type FapshiWireStatusName =
  | "CREATED"
  | "PENDING"
  | "SUCCESSFUL"
  | "FAILED"
  | "EXPIRED";

export const FAPSHI_WIRE_STATUSES: readonly FapshiWireStatusName[] = [
  "CREATED",
  "PENDING",
  "SUCCESSFUL",
  "FAILED",
  "EXPIRED",
] as const;

export function isFapshiWireStatus(value: unknown): value is FapshiWireStatusName {
  return typeof value === "string" && (FAPSHI_WIRE_STATUSES as readonly string[]).includes(value);
}

/**
 * SUCCESSFUL requires exact positive integer amount match with merchant intent.
 * Non-terminal / non-success statuses do not require amount equality.
 */
export function hasVerifiedFapshiSuccessAmount(input: {
  status: string;
  expectedAmountXaf: number;
  providerAmountXaf: unknown;
}): boolean {
  if (input.status !== "SUCCESSFUL") return true;
  const providerAmountXaf = input.providerAmountXaf;
  return (
    Number.isSafeInteger(input.expectedAmountXaf) &&
    input.expectedAmountXaf > 0 &&
    typeof providerAmountXaf === "number" &&
    Number.isSafeInteger(providerAmountXaf) &&
    providerAmountXaf > 0 &&
    providerAmountXaf === input.expectedAmountXaf
  );
}

export function isAllowedFapshiBaseUrl(url: string): boolean {
  const normalized = url.replace(/\/$/, "");
  return (FAPSHI_ALLOWED_BASE_URLS as readonly string[]).includes(normalized);
}

export function isAllowedCheckoutHost(
  hostname: string,
  extraHosts: readonly string[] = [],
): boolean {
  const host = hostname.toLowerCase();
  const allowed = new Set(
    [...FAPSHI_DEFAULT_CHECKOUT_HOSTS, ...extraHosts].map((h) => h.toLowerCase()),
  );
  if (allowed.has(host)) return true;
  // Subdomains of fapshi.com (e.g. future checkout.*.fapshi.com)
  return host.endsWith(".fapshi.com");
}

export function assertCheckoutLinkAllowed(
  link: string,
  extraHosts: readonly string[] = [],
): URL {
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new Error("CHECKOUT_LINK_REJECTED");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("CHECKOUT_LINK_REJECTED");
  }
  if (!isAllowedCheckoutHost(parsed.hostname, extraHosts)) {
    throw new Error("CHECKOUT_LINK_REJECTED");
  }
  return parsed;
}

export function assertTransId(transId: unknown): string {
  if (typeof transId !== "string" || !/^[a-zA-Z0-9_-]{4,128}$/.test(transId)) {
    throw new Error("PROVIDER_ERROR");
  }
  return transId;
}

export function assertExternalId(externalId: unknown): string {
  if (typeof externalId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(externalId)) {
    throw new Error("PROVIDER_ERROR");
  }
  return externalId;
}

/** Map official wire status to public PaymentStatus names used by API/UI. */
export function mapFapshiWireToPaymentStatus(
  wire: FapshiWireStatusName,
): "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED" | "CREATED" {
  switch (wire) {
    case "SUCCESSFUL":
      return "SUCCESSFUL";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "CREATED":
      return "CREATED";
    case "PENDING":
    default:
      return "PENDING";
  }
}

export function fapshiWebhookEventKey(transId: string, status: string): string {
  return `fapshi:${transId}:${status}`;
}

/** Redact known secret patterns from free-text logs (never log raw credentials). */
export function redactFapshiSecrets(text: string): string {
  return text
    .replace(/(apiuser|apikey|x-wh-secret|authorization)\s*[:=]\s*["']?([^\s"',}]+)/gi, "$1=[REDACTED]")
    .replace(/("(?:apiuser|apikey|api_key|webhook_secret)"\s*:\s*")([^"]+)(")/gi, "$1[REDACTED]$3");
}
