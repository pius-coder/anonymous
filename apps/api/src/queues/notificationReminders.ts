import { Queue } from "bullmq";
import { notificationReminderJobId } from "../notifications/notifications.js";

export const NOTIFICATION_QUEUE = "session-jeu";
export const NOTIFICATION_SEND_JOB = "notification.send";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getNotificationQueue() {
  queue ??= new Queue(NOTIFICATION_QUEUE, { connection });
  return queue;
}

export async function scheduleNotificationReminder(input: {
  notificationJobId: string;
  sessionId: string;
  type: string;
  scheduledFor: Date;
}) {
  const delay = Math.max(0, input.scheduledFor.getTime() - Date.now());
  await getNotificationQueue().add(
    NOTIFICATION_SEND_JOB,
    {
      notificationJobId: input.notificationJobId,
      sessionId: input.sessionId,
      type: input.type,
      scheduledFor: input.scheduledFor.toISOString(),
    },
    {
      delay,
      jobId: notificationReminderJobId({ sessionId: input.sessionId, type: input.type }),
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
}
