export type WorkerRuntimeConfig = {
  redisUrl: string;
  /** BullMQ / ioredis logical DB index when not encoded in URL. */
  redisDb: number;
  prefix: string;
  maxAttempts: number;
  /** Base delay (ms) for exponential backoff. */
  backoffDelayMs: number;
  /** Worker concurrency per queue. */
  concurrency: number;
  /** Default notification channel written on DeliveryLog. */
  defaultChannel: string;
  /** When true, process.exit is not called after shutdown (tests). */
  quietShutdown: boolean;
};

function intEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Runtime configuration. Retries and backoff are explicit and env-overridable.
 */
export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerRuntimeConfig {
  const redisUrl = env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
  return {
    redisUrl,
    redisDb: intEnv(env, "REDIS_DB", 0),
    prefix: env.BULLMQ_PREFIX?.trim() || `sj:${env.WORKTREE_ID || "default"}`,
    maxAttempts: intEnv(env, "WORKER_MAX_ATTEMPTS", 5),
    backoffDelayMs: intEnv(env, "WORKER_BACKOFF_DELAY_MS", 1000),
    concurrency: intEnv(env, "WORKER_CONCURRENCY", 2),
    defaultChannel: env.NOTIFICATION_CHANNEL?.trim() || "whatsapp",
    quietShutdown: env.WORKER_QUIET_SHUTDOWN === "1" || env.NODE_ENV === "test",
  };
}

export const QUEUE_NAMES = {
  NOTIFICATION: "notification-delivery",
  ROUND_DEADLINE: "round-deadline-close",
  PAYMENT_RECONCILIATION: "payment-reconciliation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
