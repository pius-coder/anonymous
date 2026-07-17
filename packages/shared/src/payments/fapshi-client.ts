/**
 * Official Fapshi HTTP client with dual credential boundaries:
 * - COLLECTION: status poll / expire (collection service)
 * - PAYOUT: disbursement only (separate apiuser/apikey — never mixed)
 *
 * Never logs secrets. Never invents SUCCESSFUL from timeouts.
 */

export type FapshiServiceKind = "COLLECTION" | "PAYOUT";

function isStrictDeployEnv(): boolean {
  const app = (process.env.APP_ENV ?? "").toLowerCase();
  if (app === "staging" || app === "production") return true;
  return process.env.NODE_ENV === "production" && !process.env.APP_ENV;
}

export type FapshiWireStatusName =
  | "CREATED"
  | "PENDING"
  | "SUCCESSFUL"
  | "FAILED"
  | "EXPIRED"
  | "UNKNOWN";

export type FapshiStatusResponse = {
  transId: string;
  status: FapshiWireStatusName;
  amount?: number;
  revenue?: number;
  externalId?: string;
  userId?: string;
  dateInitiated?: string;
  dateConfirmed?: string;
};

export type FapshiPayoutInput = {
  amount: number;
  phone?: string;
  email?: string;
  medium?: "mobile money" | "orange money" | "fapshi";
  name?: string;
  userId?: string;
  externalId: string;
  message?: string;
};

export type FapshiPayoutResult = {
  transId: string;
  message?: string;
  dateInitiated?: string;
  outcome: "ACCEPTED" | "REFUSED" | "AMBIGUOUS";
};

export class FapshiClientError extends Error {
  readonly kind: "CONFIG" | "HTTP" | "PARSE" | "AMBIGUOUS";
  readonly httpStatus?: number;

  constructor(
    message: string,
    kind: FapshiClientError["kind"] = "HTTP",
    httpStatus?: number,
  ) {
    super(message);
    this.name = "FapshiClientError";
    this.kind = kind;
    this.httpStatus = httpStatus;
  }
}

const ALLOWED_HOSTS = new Set(["sandbox.fapshi.com", "live.fapshi.com"]);

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export function resolveFapshiBaseUrl(service: FapshiServiceKind): string {
  const dedicated =
    service === "PAYOUT" ? env("FAPSHI_PAYOUT_BASE_URL") : env("FAPSHI_COLLECTION_BASE_URL");
  const base = dedicated ?? env("FAPSHI_BASE_URL");
  if (!base) {
    if (isStrictDeployEnv()) {
      throw new FapshiClientError("Fapshi base URL missing", "CONFIG");
    }
    return "https://sandbox.fapshi.com";
  }
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    throw new FapshiClientError("Fapshi base URL invalid", "CONFIG");
  }
  if (isStrictDeployEnv() && !ALLOWED_HOSTS.has(host)) {
    throw new FapshiClientError(`Fapshi host not allowlisted: ${host}`, "CONFIG");
  }
  return base.replace(/\/$/, "");
}

export function resolveFapshiCredentials(service: FapshiServiceKind): {
  apiuser: string;
  apikey: string;
} {
  if (service === "PAYOUT") {
    const apiuser = env("FAPSHI_PAYOUT_API_USER") ?? env("FAPSHI_API_USER");
    const apikey = env("FAPSHI_PAYOUT_API_KEY") ?? env("FAPSHI_API_KEY");
    if (!apiuser || !apikey) {
      throw new FapshiClientError("Fapshi PAYOUT credentials missing", "CONFIG");
    }
    // Hard boundary: payout keys must not silently fall back when dedicated keys expected in strict.
    if (
      isStrictDeployEnv() &&
      (!env("FAPSHI_PAYOUT_API_USER") || !env("FAPSHI_PAYOUT_API_KEY"))
    ) {
      throw new FapshiClientError(
        "Strict deploy requires dedicated FAPSHI_PAYOUT_API_USER/KEY",
        "CONFIG",
      );
    }
    return { apiuser, apikey };
  }

  const apiuser = env("FAPSHI_COLLECTION_API_USER") ?? env("FAPSHI_API_USER");
  const apikey = env("FAPSHI_COLLECTION_API_KEY") ?? env("FAPSHI_API_KEY");
  if (!apiuser || !apikey) {
    throw new FapshiClientError("Fapshi COLLECTION credentials missing", "CONFIG");
  }
  return { apiuser, apikey };
}

function mapWireStatus(raw: unknown): FapshiWireStatusName {
  const s = String(raw ?? "").toUpperCase();
  if (s === "CREATED" || s === "PENDING" || s === "SUCCESSFUL" || s === "FAILED" || s === "EXPIRED") {
    return s;
  }
  return "UNKNOWN";
}

async function requestFapshi<T>(
  service: FapshiServiceKind,
  path: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<{ ok: true; data: T } | { ok: false; ambiguous: true; status?: number }> {
  const { apiuser, apikey } = resolveFapshiCredentials(service);
  const base = resolveFapshiBaseUrl(service);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apiuser,
        apikey,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });

    // Network accepted but body unreadable → ambiguous for safe ops (GET status / payout after write).
    let body: unknown = {};
    try {
      body = await res.json();
    } catch {
      if (init.method && init.method !== "GET") {
        return { ok: false, ambiguous: true, status: res.status };
      }
      throw new FapshiClientError("Fapshi response not JSON", "PARSE", res.status);
    }

    if (!res.ok) {
      const message =
        typeof body === "object" && body && "message" in body
          ? String((body as { message?: string }).message ?? "Fapshi error")
          : "Fapshi error";
      // 4xx refused vs 5xx ambiguous for mutating calls
      if (res.status >= 500 && init.method && init.method !== "GET") {
        return { ok: false, ambiguous: true, status: res.status };
      }
      throw new FapshiClientError(message, "HTTP", res.status);
    }

    return { ok: true, data: body as T };
  } catch (err) {
    if (err instanceof FapshiClientError) throw err;
    if (init.method && init.method !== "GET") {
      return { ok: false, ambiguous: true };
    }
    throw new FapshiClientError(
      err instanceof Error ? err.message : "Fapshi network error",
      "HTTP",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Collection: official GET /payment-status/:transId */
export async function getCollectionPaymentStatus(
  transId: string,
): Promise<FapshiStatusResponse> {
  const result = await requestFapshi<Record<string, unknown>>(
    "COLLECTION",
    `/payment-status/${encodeURIComponent(transId)}`,
    { method: "GET" },
  );
  if (!result.ok) {
    return {
      transId,
      status: "UNKNOWN",
    };
  }
  const data = result.data;
  return {
    transId: String(data.transId ?? transId),
    status: mapWireStatus(data.status),
    amount: typeof data.amount === "number" ? data.amount : undefined,
    revenue: typeof data.revenue === "number" ? data.revenue : undefined,
    externalId: data.externalId != null ? String(data.externalId) : undefined,
    userId: data.userId != null ? String(data.userId) : undefined,
    dateInitiated: data.dateInitiated != null ? String(data.dateInitiated) : undefined,
    dateConfirmed: data.dateConfirmed != null ? String(data.dateConfirmed) : undefined,
  };
}

/** Collection: official POST /expire-pay */
export async function expireCollectionPayment(
  transId: string,
): Promise<FapshiStatusResponse | { outcome: "AMBIGUOUS" }> {
  const result = await requestFapshi<Record<string, unknown>>(
    "COLLECTION",
    "/expire-pay",
    {
      method: "POST",
      body: JSON.stringify({ transId }),
    },
  );
  if (!result.ok) {
    return { outcome: "AMBIGUOUS" };
  }
  return {
    transId: String(result.data.transId ?? transId),
    status: mapWireStatus(result.data.status ?? "EXPIRED"),
  };
}

/**
 * Payout service only — never call with collection credentials.
 * Official POST /payout. Ambiguous network after accept must not auto-retry blindly.
 */
export async function executePayout(
  input: FapshiPayoutInput,
): Promise<FapshiPayoutResult> {
  if (input.amount < 100) {
    throw new FapshiClientError("Payout amount below Fapshi minimum (100 XAF)", "CONFIG");
  }

  const body: Record<string, unknown> = {
    amount: Math.floor(input.amount),
    externalId: input.externalId,
  };
  if (input.phone) body.phone = input.phone;
  if (input.email) body.email = input.email;
  if (input.medium) body.medium = input.medium;
  if (input.name) body.name = input.name;
  if (input.userId) body.userId = input.userId;
  if (input.message) body.message = input.message;

  const result = await requestFapshi<{
    message?: string;
    transId?: string;
    dateInitiated?: string;
  }>("PAYOUT", "/payout", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return {
      transId: input.externalId,
      outcome: "AMBIGUOUS",
      message: "Payout response ambiguous — reconcile via payment-status, do not re-send",
    };
  }

  if (!result.data.transId) {
    return {
      transId: input.externalId,
      outcome: "AMBIGUOUS",
      message: "Payout accepted without transId",
    };
  }

  return {
    transId: result.data.transId,
    message: result.data.message,
    dateInitiated: result.data.dateInitiated,
    outcome: "ACCEPTED",
  };
}

/** Map official wire name to prisma-compatible enum string (no invention). */
export function wireStatusToEnum(status: FapshiWireStatusName): string {
  if (status === "UNKNOWN") return "UNSPECIFIED";
  return status;
}
