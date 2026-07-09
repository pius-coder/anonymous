import { Redis } from "ioredis";

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

export async function publishRoundResolved(input: {
  sessionId: string;
  roundId: string;
  scores: Record<string, number>;
  ranks: Record<string, number>;
  qualifiedIds: string[];
  eliminatedIds: string[];
  tieGroups: string[][];
}) {
  try {
    const client = getRedis();
    await client.publish(
      `round:resolved:${input.sessionId}`,
      JSON.stringify({
        roundId: input.roundId,
        sessionId: input.sessionId,
        scores: input.scores,
        ranks: input.ranks,
        qualifiedIds: input.qualifiedIds,
        eliminatedIds: input.eliminatedIds,
        tieGroups: input.tieGroups,
      }),
    );
  } catch (error) {
    console.error("Failed to publish round.resolved:", error);
  }
}

export function closeRedis() {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}