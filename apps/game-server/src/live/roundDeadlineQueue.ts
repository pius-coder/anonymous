import { Queue } from "bullmq";

export const ROUND_DEADLINE_QUEUE = "session-jeu";
export const ROUND_DEADLINE_JOB = "round.deadline";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getRoundDeadlineQueue() {
  queue ??= new Queue(ROUND_DEADLINE_QUEUE, { connection });
  return queue;
}

export function roundDeadlineJobId(roundId: string) {
  return `${ROUND_DEADLINE_JOB}-${roundId}`;
}

export async function scheduleRoundDeadline(input: {
  sessionId: string;
  roundId: string;
  deadlineAt: Date;
}) {
  await getRoundDeadlineQueue().add(
    ROUND_DEADLINE_JOB,
    {
      sessionId: input.sessionId,
      roundId: input.roundId,
      deadlineAt: input.deadlineAt.toISOString(),
    },
    {
      delay: Math.max(0, input.deadlineAt.getTime() - Date.now()),
      jobId: roundDeadlineJobId(input.roundId),
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
}
