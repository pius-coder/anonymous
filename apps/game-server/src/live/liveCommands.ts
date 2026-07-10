import { Redis } from "ioredis";

export type LiveCommand =
  | {
      type: "start-round";
      sessionId: string;
      roundNum: number;
      durationMs?: number;
      requestedBy: string;
      requestedAt: string;
    };

let subscriber: InstanceType<typeof Redis> | null = null;
const callbacks = new Map<string, (command: LiveCommand) => void>();

function getSubscriber() {
  subscriber ??= new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  return subscriber;
}

function liveCommandChannel(sessionId: string) {
  return `live:command:${sessionId}`;
}

export async function subscribeToLiveCommands(
  sessionId: string,
  callback: (command: LiveCommand) => void,
): Promise<() => void> {
  const channel = liveCommandChannel(sessionId);
  const client = getSubscriber();

  if (!callbacks.has(channel)) {
    await client.subscribe(channel);
    client.on("message", (ch: string, message: string) => {
      if (ch !== channel) return;
      const cb = callbacks.get(channel);
      if (!cb) return;
      try {
        cb(JSON.parse(message) as LiveCommand);
      } catch (error) {
        console.error(`Failed to parse live command for ${channel}:`, error);
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

export function closeLiveCommandSubscriber() {
  if (subscriber) {
    subscriber.disconnect();
    subscriber = null;
    callbacks.clear();
  }
}
