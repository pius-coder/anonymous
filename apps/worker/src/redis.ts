import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import type { WorkerRuntimeConfig } from "./config.js";

export type RedisConnectionFields = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  maxRetriesPerRequest: null;
};

/**
 * Build BullMQ connection options from REDIS_URL.
 * Each Queue/Worker should receive its own connection (BullMQ recommendation).
 */
export function createBullConnection(config: WorkerRuntimeConfig): ConnectionOptions {
  return createRedisFields(config) as ConnectionOptions;
}

export function createRedisFields(config: WorkerRuntimeConfig): RedisConnectionFields {
  const url = new URL(config.redisUrl);
  const dbFromPath =
    url.pathname && url.pathname !== "/"
      ? Number.parseInt(url.pathname.replace(/^\//, ""), 10)
      : Number.NaN;

  return {
    host: url.hostname || "127.0.0.1",
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isFinite(dbFromPath) ? dbFromPath : config.redisDb,
    maxRetriesPerRequest: null,
  };
}

/**
 * Direct ioredis client for tests (flush prefix keys, health).
 */
export function createRedisClient(config: WorkerRuntimeConfig): Redis {
  const opts = createRedisFields(config);
  return new Redis({
    host: opts.host,
    port: opts.port,
    username: opts.username,
    password: opts.password,
    db: opts.db,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}
