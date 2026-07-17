/**
 * Collection-only Fapshi payment-status client for reconciliation.
 * Same official contract as API: apiuser/apikey + GET /payment-status/:transId.
 * Never used for initiate/payout. Fail-closed when config missing.
 */
import {
  assertTransId,
  isAllowedFapshiBaseUrl,
  isFapshiWireStatus,
  redactFapshiSecrets,
  type FapshiWireStatusName,
} from "@session-jeu/shared";
import type { ProviderStatusClient } from "../jobs/paymentReconciliation.js";

const DEFAULT_TIMEOUT_MS = 15_000;

function resolveBaseUrl(): string {
  const fromEnv = process.env.FAPSHI_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) {
    if (!isAllowedFapshiBaseUrl(fromEnv)) {
      throw new Error("FAPSHI_BASE_URL not allowlisted");
    }
    return fromEnv;
  }
  if (process.env.FAPSHI_ENV === "live") return "https://live.fapshi.com";
  if (process.env.FAPSHI_ENV === "sandbox") return "https://sandbox.fapshi.com";
  throw new Error("FAPSHI_BASE_URL or FAPSHI_ENV required");
}

function credentials(): { apiuser: string; apikey: string } {
  const apiuser = process.env.FAPSHI_API_USER?.trim();
  const apikey = process.env.FAPSHI_API_KEY?.trim();
  if (!apiuser || !apikey) {
    throw new Error("FAPSHI_API_USER and FAPSHI_API_KEY required");
  }
  return { apiuser, apikey };
}

/** Returns a status client when collection credentials are configured; otherwise null (age-only recon). */
export function tryCreateFapshiStatusClient(): ProviderStatusClient | null {
  try {
    resolveBaseUrl();
    credentials();
  } catch {
    return null;
  }

  return {
    async getPaymentStatus(transId: string) {
      const safeId = assertTransId(transId);
      const baseUrl = resolveBaseUrl();
      const { apiuser, apikey } = credentials();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const response = await fetch(
          `${baseUrl}/payment-status/${encodeURIComponent(safeId)}`,
          {
            method: "GET",
            headers: { apiuser, apikey },
            signal: controller.signal,
          },
        );
        const raw = await response.text();
        let body: Record<string, unknown> = {};
        if (raw) {
          try {
            body = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            throw new Error("Malformed Fapshi payment-status JSON");
          }
        }
        if (!response.ok) {
          const msg =
            typeof body.message === "string"
              ? redactFapshiSecrets(body.message)
              : `Fapshi HTTP ${response.status}`;
          throw new Error(msg);
        }
        if (typeof body.transId !== "string" || !isFapshiWireStatus(body.status)) {
          throw new Error("Malformed payment-status body");
        }
        return {
          transId: assertTransId(body.transId),
          status: body.status as FapshiWireStatusName,
          amount: typeof body.amount === "number" ? body.amount : undefined,
          externalId: typeof body.externalId === "string" ? body.externalId : undefined,
          userId: typeof body.userId === "string" ? body.userId : undefined,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
