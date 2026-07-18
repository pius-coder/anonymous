import { Redis } from "ioredis";
import { config } from "../config.js";

const MAXMEMORY_POLICY_PATTERN = /^maxmemory_policy:(.+)$/m;

function createRedisClient(): Redis {
  return new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: config.redisReadyTimeoutMs,
  });
}

function parseMaxmemoryPolicy(info: string): string | null {
  const match = info.match(MAXMEMORY_POLICY_PATTERN);
  return match?.[1]?.trim() ?? null;
}

export async function assertGameServerReadiness(): Promise<{
  mode: "redis" | "local";
  maxmemoryPolicy?: string | null;
}> {
  if (config.presence !== "redis") {
    return { mode: "local" };
  }

  const client = createRedisClient();
  try {
    await client.connect();
    await client.ping();

    const memoryInfo = await client.info("memory");
    const policy = parseMaxmemoryPolicy(memoryInfo);

    if (config.requireRedisNoEviction && policy !== "noeviction") {
      throw new Error(
        `Redis maxmemory-policy must be noeviction for authoritative live rooms (got ${policy ?? "unknown"})`,
      );
    }

    return { mode: "redis", maxmemoryPolicy: policy };
  } finally {
    await client.quit().catch(() => undefined);
  }
}
