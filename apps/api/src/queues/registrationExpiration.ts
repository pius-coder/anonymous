import { Queue } from "bullmq";

export const REGISTRATION_EXPIRATION_QUEUE = "session-jeu";
export const REGISTRATION_EXPIRATION_JOB = "registration.expire";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getRegistrationQueue() {
  queue ??= new Queue(REGISTRATION_EXPIRATION_QUEUE, { connection });
  return queue;
}

export function registrationExpirationJobId(registrationId: string) {
  return `${REGISTRATION_EXPIRATION_JOB}:${registrationId}`;
}

export async function scheduleRegistrationExpiration(input: {
  registrationId: string;
  paymentDeadlineAt: Date;
}) {
  const delay = Math.max(0, input.paymentDeadlineAt.getTime() - Date.now());
  await getRegistrationQueue().add(
    REGISTRATION_EXPIRATION_JOB,
    {
      registrationId: input.registrationId,
      paymentDeadlineAt: input.paymentDeadlineAt.toISOString(),
    },
    {
      delay,
      jobId: registrationExpirationJobId(input.registrationId),
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
}
