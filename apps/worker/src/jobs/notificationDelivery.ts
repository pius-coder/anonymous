import { notificationRepository } from "@session-jeu/db";
import type { NotificationProvider } from "@session-jeu/whatsapp-gateway";
import { log } from "../logging.js";
import { recordFailure, recordRetry, recordSkipped, recordSuccess } from "../metrics.js";

export type NotificationDeliveryPayload = {
  notificationJobId: string;
  correlationId: string;
  channel?: string;
};

export type NotificationDeliveryResult = {
  outcome: "sent" | "skipped" | "failed";
  notificationJobId: string;
  deliveryLogId?: string;
  reason?: string;
};

export class RetryableDeliveryError extends Error {
  readonly retryable = true;
  readonly errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = "RetryableDeliveryError";
    this.errorCode = errorCode;
  }
}

export class TerminalDeliveryError extends Error {
  readonly retryable = false;
  readonly errorCode: string;

  constructor(message: string, errorCode: string) {
    super(message);
    this.name = "TerminalDeliveryError";
    this.errorCode = errorCode;
  }
}

export type DeliverOptions = {
  provider: NotificationProvider;
  channel: string;
  /** 1-based attempt number from BullMQ (attemptsMade + 1). */
  attempt: number;
  maxAttempts: number;
};

/**
 * Deliver a single NotificationJob via the injected provider.
 * Idempotent: SENT/FAILED jobs are skipped (no second provider send).
 * Terminal failure writes DeliveryLog with status FAILED.
 */
export async function deliverNotificationJob(
  payload: NotificationDeliveryPayload,
  options: DeliverOptions,
): Promise<NotificationDeliveryResult> {
  const { notificationJobId, correlationId } = payload;
  const channel = payload.channel ?? options.channel;

  const job = await notificationRepository.findNotificationJobById(notificationJobId);
  if (!job) {
    recordSkipped();
    log.warn("notification job missing", { correlationId, jobId: notificationJobId });
    return { outcome: "skipped", notificationJobId, reason: "NOT_FOUND" };
  }

  if (job.status === "SENT" || job.status === "FAILED") {
    recordSkipped();
    log.info("notification already terminal, skip", {
      correlationId,
      jobId: notificationJobId,
      status: job.status,
    });
    return { outcome: "skipped", notificationJobId, reason: `ALREADY_${job.status}` };
  }

  if (job.status === "PENDING") {
    await notificationRepository.updateNotificationJobStatus(notificationJobId, "PROCESSING");
  }

  const sendResult = await options.provider.send({
    jobId: notificationJobId,
    userId: job.userId,
    channel,
    type: job.type,
    payload: job.payload,
    correlationId,
  });

  if (sendResult.ok) {
    await notificationRepository.updateNotificationJobStatus(notificationJobId, "SENT");
    const delivery = await notificationRepository.createDeliveryLog({
      jobId: notificationJobId,
      channel,
      status: "SENT",
    });
    recordSuccess();
    log.info("notification delivered", {
      correlationId,
      jobId: notificationJobId,
      jobName: "notification-delivery",
      attempt: options.attempt,
      providerMessageId: sendResult.providerMessageId,
    });
    return {
      outcome: "sent",
      notificationJobId,
      deliveryLogId: delivery.id,
    };
  }

  const isLastAttempt = options.attempt >= options.maxAttempts;
  const willRetry = sendResult.retryable && !isLastAttempt;

  if (willRetry) {
    recordRetry();
    log.warn("notification delivery retryable failure", {
      correlationId,
      jobId: notificationJobId,
      jobName: "notification-delivery",
      attempt: options.attempt,
      maxAttempts: options.maxAttempts,
      errorCode: sendResult.errorCode,
    });
    throw new RetryableDeliveryError(sendResult.errorMessage, sendResult.errorCode);
  }

  await notificationRepository.updateNotificationJobStatus(notificationJobId, "FAILED");
  const delivery = await notificationRepository.createDeliveryLog({
    jobId: notificationJobId,
    channel,
    status: "FAILED",
    error: `${sendResult.errorCode}: ${sendResult.errorMessage}`,
  });
  recordFailure();
  log.error("notification delivery terminal failure", {
    correlationId,
    jobId: notificationJobId,
    jobName: "notification-delivery",
    attempt: options.attempt,
    errorCode: sendResult.errorCode,
  });

  // Do not throw after writing FAILED — effect is complete and durable.
  return {
    outcome: "failed",
    notificationJobId,
    deliveryLogId: delivery.id,
    reason: sendResult.errorCode,
  };
}
