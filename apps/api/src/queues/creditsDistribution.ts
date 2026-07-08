import { Queue } from "bullmq";
import { creditsDistributionJobId } from "../results/results.js";

export const CREDITS_DISTRIBUTION_QUEUE = "session-jeu";
export const CREDITS_DISTRIBUTION_JOB = "credits.distribute";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getCreditsDistributionQueue() {
  queue ??= new Queue(CREDITS_DISTRIBUTION_QUEUE, { connection });
  return queue;
}

export async function scheduleCreditsDistribution(input: { sessionId: string }) {
  await getCreditsDistributionQueue().add(
    CREDITS_DISTRIBUTION_JOB,
    { sessionId: input.sessionId },
    {
      jobId: creditsDistributionJobId(input.sessionId),
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
    },
  );
}
