export const config = {
  port: Number(process.env.GAME_SERVER_PORT) || 3002,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  reconnectTimeoutMs: Number(process.env.RECONNECT_TIMEOUT_MS) || 30_000,
  maxClientsPerRoom: Number(process.env.MAX_CLIENTS_PER_ROOM) || 100,
  presence: process.env.REDIS_URL ? "redis" : "local",
};
