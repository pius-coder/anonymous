import { z } from "zod";
import { Prisma, prisma, GameSessionStatus, SessionRegistrationStatus } from "@session-jeu/db";
import { scheduleRegistrationExpiration } from "../queues/registrationExpiration.js";

export const REGISTRATION_PAYMENT_DEADLINE_MS = 15 * 60 * 1000;
const MAX_REGISTER_RETRIES = 5;

export const sessionIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const registrationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const cancelRegistrationSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const activeRegistrationStatuses = [
  SessionRegistrationStatus.CREATED,
  SessionRegistrationStatus.PAYMENT_PENDING,
  SessionRegistrationStatus.PAID,
] as const;

export const capacityHoldingRegistrationStatuses = [
  SessionRegistrationStatus.PAYMENT_PENDING,
  SessionRegistrationStatus.PAID,
] as const;

export type RegisterSessionResult =
  | { type: "ok"; registration: RegistrationRecord }
  | { type: "not-found" }
  | { type: "closed"; code: "SESSION_CANCELLED" | "REGISTRATION_CLOSED" }
  | { type: "already-registered"; registration: RegistrationRecord }
  | { type: "full" };

type RegistrationRecord = {
  id: string;
  userId: string;
  sessionId: string;
  status: string;
  paymentDeadlineAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function isRetryablePrismaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function withSerializableRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryablePrismaError(error) || attempt === MAX_REGISTER_RETRIES - 1) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

export function serializeRegistration(registration: RegistrationRecord) {
  return {
    id: registration.id,
    userId: registration.userId,
    sessionId: registration.sessionId,
    status: registration.status,
    paymentDeadlineAt: registration.paymentDeadlineAt?.toISOString() ?? null,
    paidAt: registration.paidAt?.toISOString() ?? null,
    cancelledAt: registration.cancelledAt?.toISOString() ?? null,
    cancellationReason: registration.cancellationReason,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
  };
}

export async function registerForSession(input: {
  userId: string;
  sessionId: string;
  now?: Date;
}): Promise<RegisterSessionResult> {
  const now = input.now ?? new Date();
  const paymentDeadlineAt = new Date(now.getTime() + REGISTRATION_PAYMENT_DEADLINE_MS);

  const result = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          select: {
            id: true,
            status: true,
            maxPlayers: true,
            registrationClosesAt: true,
          },
        });

        if (!session) return { type: "not-found" as const };
        if (session.status === GameSessionStatus.CANCELLED) {
          return { type: "closed" as const, code: "SESSION_CANCELLED" as const };
        }
        if (
          session.status !== GameSessionStatus.ACTIVE ||
          (session.registrationClosesAt && session.registrationClosesAt <= now)
        ) {
          return { type: "closed" as const, code: "REGISTRATION_CLOSED" as const };
        }

        const existing = await tx.sessionRegistration.findFirst({
          where: {
            userId: input.userId,
            sessionId: input.sessionId,
            status: { in: [...activeRegistrationStatuses] },
          },
        });
        if (existing) return { type: "already-registered" as const, registration: existing };

        const reservedCount = await tx.sessionRegistration.count({
          where: {
            sessionId: input.sessionId,
            status: { in: [...capacityHoldingRegistrationStatuses] },
          },
        });
        if (reservedCount >= session.maxPlayers) return { type: "full" as const };

        const registration = await tx.sessionRegistration.create({
          data: {
            userId: input.userId,
            sessionId: input.sessionId,
            status: SessionRegistrationStatus.PAYMENT_PENDING,
            paymentDeadlineAt,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.userId,
            action: "registration.created",
            entity: "SessionRegistration",
            entityId: registration.id,
            newData: serializeRegistration(registration),
          },
        });

        return { type: "ok" as const, registration };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );

  if (result.type === "ok") {
    await scheduleRegistrationExpiration({
      registrationId: result.registration.id,
      paymentDeadlineAt,
    });
  }

  return result;
}
