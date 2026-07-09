import { Redis } from "ioredis";

export type RoundResolvedPayload = {
  roundId: string;
  sessionId: string;
  scores: Record<string, number>;
  ranks: Record<string, number>;
  qualifiedIds: string[];
  eliminatedIds: string[];
  tieGroups: string[][];
};

let subscriber: InstanceType<typeof Redis> | null = null;
const callbacks = new Map<string, (payload: RoundResolvedPayload) => void>();

function getSubscriber() {
  subscriber ??= new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  return subscriber;
}

export async function subscribeToRoundResolved(
  sessionId: string,
  callback: (payload: RoundResolvedPayload) => void,
): Promise<() => void> {
  const channel = `round:resolved:${sessionId}`;
  const client = getSubscriber();

  if (!callbacks.has(channel)) {
    await client.subscribe(channel);
    client.on("message", (ch: string, message: string) => {
      if (ch === channel) {
        const cb = callbacks.get(channel);
        if (cb) {
          try {
            const payload = JSON.parse(message) as RoundResolvedPayload;
            cb(payload);
          } catch (error) {
            console.error(`Failed to parse round.resolved for ${channel}:`, error);
          }
        }
      }
    });
  }

  callbacks.set(channel, callback);

  return () => {
    callbacks.delete(channel);
    if (!callbacks.has(channel)) {
      client.unsubscribe(channel).catch(() => {});
    }
  };
}

export function closeRedisSubscriber() {
  if (subscriber) {
    subscriber.disconnect();
    subscriber = null;
    callbacks.clear();
  }
}
