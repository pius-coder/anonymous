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

export function liveCommandChannel(sessionId: string) {
  return `live:command:${sessionId}`;
}

export async function publishLiveCommand(command: LiveCommand) {
  await getRedis().publish(liveCommandChannel(command.sessionId), JSON.stringify(command));
}

