/**
 * Server-side live policy. Never accept client join options for these values.
 */
function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  get port(): number {
    return envInt("GAME_SERVER_PORT", 3002);
  },
  get redisUrl(): string {
    return process.env.REDIS_URL || "redis://localhost:6379";
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
};
