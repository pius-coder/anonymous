/**
 * Server-side live policy. Never accept client join options for these values.
 * P-SEQ-00: no silent localhost Redis in staging/production.
 */
import { isStrictDeployEnv, resolveAppEnv } from "@session-jeu/config";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function envCsv(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const strictDeployEnv = isStrictDeployEnv(resolveAppEnv());

export const config = {
  get port(): number {
    return envInt("GAME_SERVER_PORT", 3002);
  },
  get redisUrl(): string {
    if (process.env.REDIS_URL) return process.env.REDIS_URL;
    if (strictDeployEnv) {
      throw new Error("REDIS_URL is required in staging/production");
    }
    return "redis://localhost:6379";
  },
  get isStrictDeployEnv(): boolean {
    return strictDeployEnv;
  },
  /** Authoritative reconnect window (ms). Clients cannot override. */
  get reconnectTimeoutMs(): number {
    return envInt("RECONNECT_TIMEOUT_MS", 30_000);
  },
  /** Authoritative max clients per room. Clients cannot override. */
  get maxClientsPerRoom(): number {
    return envInt("MAX_CLIENTS_PER_ROOM", 100);
  },
  get presence(): "redis" | "local" {
    return process.env.REDIS_URL ? "redis" : "local";
  },
  get allowedOrigins(): string[] {
    const origins = envCsv("GAME_ALLOWED_ORIGINS");
    if (strictDeployEnv && origins.length === 0) {
      throw new Error("GAME_ALLOWED_ORIGINS is required in staging/production");
    }
    return origins;
  },
  get requireOriginHeader(): boolean {
    return envBool("GAME_REQUIRE_ORIGIN_HEADER", strictDeployEnv);
  },
  get maxPayloadBytes(): number {
    return envInt("GAME_MAX_PAYLOAD_BYTES", 16 * 1024);
  },
  get maxMessagesPerWindow(): number {
    return envInt("GAME_MAX_MESSAGES_PER_WINDOW", 60);
  },
  get messageWindowMs(): number {
    return envInt("GAME_MESSAGE_WINDOW_MS", 1_000);
  },
  get pingIntervalMs(): number {
    return envInt("GAME_PING_INTERVAL_MS", 6_000);
  },
  get pingMaxRetries(): number {
    return envInt("GAME_PING_MAX_RETRIES", 4);
  },
  get redisReadyTimeoutMs(): number {
    return envInt("GAME_REDIS_READY_TIMEOUT_MS", 5_000);
  },
  get requireRedisNoEviction(): boolean {
    return envBool("GAME_REQUIRE_REDIS_NOEVICTION", this.presence === "redis");
  },
  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return !this.requireOriginHeader;
    }
    const allowlist = this.allowedOrigins;
    if (allowlist.length === 0) {
      return !strictDeployEnv;
    }
    return allowlist.includes(origin);
  },
};
