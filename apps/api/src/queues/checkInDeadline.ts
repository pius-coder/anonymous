import { Queue } from "bullmq";

export const CHECK_IN_DEADLINE_QUEUE = "session-jeu";
export const CHECK_IN_DEADLINE_JOB = "checkin.deadline";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getCheckInDeadlineQueue() {
  queue ??= new Queue(CHECK_IN_DEADLINE_QUEUE, { connection });
  return queue;
}

export function checkInDeadlineJobId(sessionId: string) {
  return `${CHECK_IN_DEADLINE_JOB}-${sessionId}`;
}

export async function scheduleCheckInDeadline(input: {
  sessionId: string;
  checkInDeadlineAt: Date;
}) {
  const delay = Math.max(0, input.checkInDeadlineAt.getTime() - Date.now());
  await getCheckInDeadlineQueue().add(
    CHECK_IN_DEADLINE_JOB,
    {
      sessionId: input.sessionId,
      checkInDeadlineAt: input.checkInDeadlineAt.toISOString(),
    },
    {
      delay,
      jobId: checkInDeadlineJobId(input.sessionId),
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
}
