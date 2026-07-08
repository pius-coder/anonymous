import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  PaymentStatus,
  Prisma,
  SessionRegistrationStatus,
  prisma,
} from "@session-jeu/db";
import { schedulePaymentReconciliation } from "../queues/paymentReconciliation.js";
import { scheduleNotificationReminder } from "../queues/notificationReminders.js";
import { queueNotificationSafely } from "../notifications/notifications.js";
import {
  FAPSHI_MIN_AMOUNT_XAF,
  FAPSHI_PROVIDER,
  type FapshiProviderStatus,
  type FapshiStatusResponse,
  initiateFapshiPayment,
} from "./fapshiClient.js";

export const initiateFapshiSchema = z.object({
  registrationId: z.string().min(1),
  redirectUrl: z.string().url().optional(),
});

export const paymentIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const fapshiWebhookSchema = z
  .object({
    transId: z.string().min(1),
    status: z.enum(["CREATED", "PENDING", "SUCCESSFUL", "FAILED", "EXPIRED"]),
    amount: z.number().int().optional(),
    externalId: z.string().optional(),
  })
  .passthrough();

export type FapshiWebhookPayload = z.infer<typeof fapshiWebhookSchema>;

export function mapFapshiStatus(status: FapshiProviderStatus) {
  if (status === "SUCCESSFUL") return PaymentStatus.SUCCESSFUL;
  if (status === "FAILED") return PaymentStatus.FAILED;
  if (status === "EXPIRED") return PaymentStatus.EXPIRED;
  return PaymentStatus.PENDING;
}

export function fapshiWebhookEventKey(payload: Pick<FapshiWebhookPayload, "transId" | "status">) {
  return `${FAPSHI_PROVIDER}:${payload.transId}:${payload.status}`;
}

function externalId() {
  return `pay-${randomBytes(12).toString("hex")}`;
}

function serializePayment(payment: {
  id: string;
  registrationId: string | null;
  userId: string;
  sessionId: string | null;
  amountXaf: number;
  currency: string;
  status: string;
  provider: string | null;
  providerExternalId: string | null;
  providerTransId: string | null;
  providerStatus: string | null;
  checkoutUrl: string | null;
  webhookReceivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    userId: payment.userId,
    sessionId: payment.sessionId,
    amountXaf: payment.amountXaf,
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    providerExternalId: payment.providerExternalId,
    providerTransId: payment.providerTransId,
    providerStatus: payment.providerStatus,
    checkoutUrl: payment.checkoutUrl,
    webhookReceivedAt: payment.webhookReceivedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export { serializePayment };

export async function initiatePaymentForRegistration(input: {
  userId: string;
  registrationId: string;
  redirectUrl?: string;
}) {
  const created = await prisma.$transaction(async (tx) => {
    const registration = await tx.sessionRegistration.findUnique({
      where: { id: input.registrationId },
      include: {
        user: { select: { id: true, email: true } },
        session: { select: { id: true, name: true, entryFeeXaf: true } },
        payment: true,
      },
    });

    if (!registration) return { type: "not-found" as const };
    if (registration.userId !== input.userId) return { type: "forbidden" as const };
    if (registration.status === SessionRegistrationStatus.EXPIRED)
      return { type: "expired" as const };
    if (registration.status !== SessionRegistrationStatus.PAYMENT_PENDING) {
      return { type: "not-pending" as const };
    }
    if (registration.paymentDeadlineAt && registration.paymentDeadlineAt <= new Date()) {
      return { type: "expired" as const };
    }
    if (registration.session.entryFeeXaf < FAPSHI_MIN_AMOUNT_XAF) {
      return { type: "amount-too-low" as const };
    }
    if (registration.payment) return { type: "existing" as const, payment: registration.payment };

    const providerExternalId = externalId();
    const payment = await tx.paymentTransaction.create({
      data: {
        userId: registration.userId,
        sessionId: registration.sessionId,
        registrationId: registration.id,
        amount: registration.session.entryFeeXaf,
        amountXaf: registration.session.entryFeeXaf,
        currency: "XAF",
        status: PaymentStatus.PENDING,
        provider: FAPSHI_PROVIDER,
        providerExternalId,
        providerStatus: "CREATED",
        metadata: { registrationId: registration.id },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: registration.userId,
        action: "payment.initiated",
        entity: "PaymentTransaction",
        entityId: payment.id,
        newData: serializePayment(payment),
      },
    });

    return {
      type: "created" as const,
      payment,
      registration,
      providerExternalId,
    };
  });

  if (created.type !== "created") return created;

  try {
    const provider = await initiateFapshiPayment({
      amountXaf: created.payment.amountXaf,
      email: created.registration.user.email,
      redirectUrl: input.redirectUrl,
      userId: created.registration.userId,
      externalId: created.providerExternalId,
      message: `Session ${created.registration.session.name}`,
    });

    const payment = await prisma.paymentTransaction.update({
      where: { id: created.payment.id },
      data: {
        providerTransId: provider.transId,
        checkoutUrl: provider.link,
        providerStatus: "CREATED",
        metadata: {
          provider,
          registrationId: created.registration.id,
        },
      },
    });

    await schedulePaymentReconciliation({ paymentId: payment.id });
    return { type: "ok" as const, payment };
  } catch (error) {
    await prisma.paymentTransaction.update({
      where: { id: created.payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerStatus: "INITIATE_FAILED",
        metadata: {
          registrationId: created.registration.id,
          initiateError: error instanceof Error ? error.message : "unknown provider error",
        },
      },
    });
    return { type: "provider-unavailable" as const };
  }
}

export async function applyFapshiPaymentStatus(input: {
  payload: FapshiStatusResponse;
  eventKey?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const result = await prisma.$transaction(
    async (tx) => {
      const eventKey = input.eventKey ?? fapshiWebhookEventKey(input.payload);
      const existingEvent = await tx.webhookEvent.findUnique({ where: { eventKey } });
      if (existingEvent?.processedAt) return { type: "replay" as const };

      const payment = await tx.paymentTransaction.findFirst({
        where: {
          OR: [
            { providerTransId: input.payload.transId },
            ...(input.payload.externalId ? [{ providerExternalId: input.payload.externalId }] : []),
          ],
        },
        include: { registration: true },
      });

      const event =
        existingEvent ??
        (await tx.webhookEvent.create({
          data: {
            provider: FAPSHI_PROVIDER,
            eventKey,
            paymentId: payment?.id,
            transId: input.payload.transId,
            status: input.payload.status,
            payload: input.payload as Prisma.InputJsonValue,
          },
        }));

      if (!payment) {
        await tx.webhookEvent.update({
          where: { id: event.id },
          data: { processedAt: now },
        });
        return { type: "unknown-payment" as const };
      }

      const nextStatus = mapFapshiStatus(input.payload.status);
      const paymentUpdate = await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          providerTransId: input.payload.transId,
          providerStatus: input.payload.status,
          webhookReceivedAt: now,
          metadata: input.payload as Prisma.InputJsonValue,
        },
      });

      let registrationPaid = false;
      if (
        input.payload.status === "SUCCESSFUL" &&
        payment.registration?.status === SessionRegistrationStatus.PAYMENT_PENDING
      ) {
        await tx.sessionRegistration.update({
          where: { id: payment.registration.id },
          data: {
            status: SessionRegistrationStatus.PAID,
            paidAt: now,
          },
        });
        registrationPaid = true;
      }

      await tx.webhookEvent.update({
        where: { id: event.id },
        data: { paymentId: payment.id, processedAt: now },
      });

      await tx.auditLog.create({
        data: {
          userId: payment.userId,
          action:
            input.payload.status === "SUCCESSFUL"
              ? "payment.successful"
              : input.payload.status === "FAILED"
                ? "payment.failed"
                : input.payload.status === "EXPIRED"
                  ? "payment.expired"
                  : "payment.webhook-received",
          entity: "PaymentTransaction",
          entityId: payment.id,
          newData: {
            payment: serializePayment(paymentUpdate),
            registrationPaid,
          },
        },
      });

      return { type: "processed" as const, payment: paymentUpdate, registrationPaid };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );

  if (
    result.type === "processed" &&
    result.payment.status === PaymentStatus.SUCCESSFUL &&
    result.registrationPaid
  ) {
    try {
      await queueNotificationSafely({
        userId: result.payment.userId,
        sessionId: result.payment.sessionId ?? undefined,
        type: "PAYMENT",
        channel: "IN_APP",
        title: "Paiement confirme",
        body: "Votre paiement est confirme. Vous pourrez faire le check-in avant le debut.",
        idempotencyKey: `payment:${result.payment.id}:successful:in-app`,
        payload: {
          paymentId: result.payment.id,
          registrationId: result.payment.registrationId,
        },
      });

      if (result.payment.sessionId) {
        const session = await prisma.gameSession.findUnique({
          where: { id: result.payment.sessionId },
          select: { id: true, name: true, startTime: true },
        });
        if (session?.startTime) {
          const scheduledFor = new Date(
            Math.max(now.getTime(), session.startTime.getTime() - 600_000),
          );
          const queued = await queueNotificationSafely({
            userId: result.payment.userId,
            sessionId: session.id,
            type: "REMINDER",
            channel: "IN_APP",
            title: "Rappel check-in",
            body: `Pensez au check-in pour ${session.name}.`,
            idempotencyKey: `session:${session.id}:user:${result.payment.userId}:checkin-reminder:in-app`,
            scheduledFor,
            payload: { sessionId: session.id },
          });
          if (queued.type === "queued") {
            await scheduleNotificationReminder({
              notificationJobId: queued.job.id,
              sessionId: session.id,
              type: `checkin:${result.payment.userId}`,
              scheduledFor,
            });
          }
        }
      }
    } catch {
      // Notification side effects are non-blocking for payment processing.
    }
  }

  return result;
}
