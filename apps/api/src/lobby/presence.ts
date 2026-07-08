import { Redis } from "ioredis";

const LOBBY_PRESENCE_TTL_SECONDS = 60;

let redis: InstanceType<typeof Redis> | null = null;

function getRedis() {
  redis ??= new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  return redis;
}

export function lobbyPresenceKey(sessionId: string) {
  return `lobby:presence:${sessionId}`;
}

export async function markLobbyPresence(input: { sessionId: string; userId: string }) {
  try {
    const client = getRedis();
    const key = lobbyPresenceKey(input.sessionId);
    await client.sadd(key, input.userId);
    await client.expire(key, LOBBY_PRESENCE_TTL_SECONDS);
    return { available: true, count: await client.scard(key), ttlSeconds: await client.ttl(key) };
  } catch {
    return { available: false, count: null, ttlSeconds: null };
  }
}

export async function getLobbyPresenceCount(sessionId: string) {
  try {
    const client = getRedis();
    const key = lobbyPresenceKey(sessionId);
    return { available: true, count: await client.scard(key), ttlSeconds: await client.ttl(key) };
  } catch {
    return { available: false, count: null, ttlSeconds: null };
  }
}
