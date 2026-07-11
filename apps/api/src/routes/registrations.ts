import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PaymentStatus, prisma, SessionRegistrationStatus } from "@session-jeu/db";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import { validationErrorDetails } from "../lib/validation.js";
import {
  activeRegistrationStatuses,
  cancelRegistrationSchema,
  registrationIdParamsSchema,
  registerForSession,
  serializeRegistration,
  sessionIdParamsSchema,
} from "../registrations/sessionRegistration.js";
import { applyFapshiPaymentStatus } from "../payments/fapshi.js";
import {
  expireFapshiPayment,
  FAPSHI_PROVIDER,
  FapshiProviderError,
  getFapshiPaymentStatus,
} from "../payments/fapshiClient.js";
import { resolvePublicSessionId } from "../sessions/resolveSession.js";

const registrations = new Hono<{ Variables: AuthVariables }>();

const validationHook = (
  result: { success: boolean; error?: unknown },
  c: Parameters<typeof errorResponse>[0],
) => {
  if (!result.success) {
    return errorResponse(
      c,
      400,
      "VALIDATION_ERROR",
      "Certains champs sont invalides",
      validationErrorDetails(result.error),
    );
  }
};

registrations.post(
  "/sessions/:id/register",
  requireAuth,
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const result = await registerForSession({ userId: user.id, sessionId });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "closed" && result.code === "SESSION_CANCELLED") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }
    if (result.type === "closed") {
      return errorResponse(c, 423, "REGISTRATION_CLOSED", "Registration is closed");
    }
    if (result.type === "already-registered") {
      return errorResponse(
        c,
        409,
        "ALREADY_REGISTERED",
        "Player already has an active registration",
        {
          registration: serializeRegistration(result.registration),
        },
      );
    }
    if (result.type === "full") {
      return errorResponse(c, 409, "SESSION_FULL", "Session is full");
    }

    return successResponse(c, { registration: serializeRegistration(result.registration) }, 201);
  },
);

registrations.get(
  "/sessions/:id/registration",
  requireAuth,
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const registration = await prisma.sessionRegistration.findFirst({
      where: {
        sessionId,
        userId: user.id,
        status: { in: [...activeRegistrationStatuses] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!registration) {
      return errorResponse(c, 404, "REGISTRATION_NOT_FOUND", "Registration not found");
    }

    return successResponse(c, { registration: serializeRegistration(registration) });
  },
);

registrations.post(
  "/registrations/:id/cancel",
  requireAuth,
  zValidator("param", registrationIdParamsSchema, validationHook),
  zValidator("json", cancelRegistrationSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const cancellationCandidate = await prisma.sessionRegistration.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!cancellationCandidate)
      return errorResponse(c, 404, "REGISTRATION_NOT_FOUND", "Registration not found");
    if (cancellationCandidate.userId !== user.id) {
      return errorResponse(
        c,
        403,
        "REGISTRATION_FORBIDDEN",
        "Registration belongs to another user",
      );
    }
    if (cancellationCandidate.status === SessionRegistrationStatus.PAID) {
      return errorResponse(
        c,
        409,
        "REGISTRATION_ALREADY_PAID",
        "Paid registrations cannot be cancelled here",
      );
    }
    if (cancellationCandidate.status !== SessionRegistrationStatus.PAYMENT_PENDING) {
      return errorResponse(
        c,
        409,
        "REGISTRATION_NOT_CANCELLABLE",
        "Registration cannot be cancelled",
      );
    }

    let providerExpired = false;
    const payment = cancellationCandidate.payment;
    if (payment?.provider === FAPSHI_PROVIDER && payment.status === PaymentStatus.PENDING) {
      if (!payment.providerTransId) {
        return errorResponse(
          c,
          409,
          "PAYMENT_CANCELLATION_PENDING",
          "Payment initiation is still in progress",
        );
      }

      try {
        const provider = await expireFapshiPayment(payment.providerTransId);
        if (provider.status === "SUCCESSFUL") {
          const settlement = await applyFapshiPaymentStatus({ payload: provider });
          return errorResponse(
            c,
            409,
            settlement.type === "amount-verification-failed"
              ? "PAYMENT_UNDER_REVIEW"
              : "REGISTRATION_ALREADY_PAID",
            "Payment status changed before cancellation",
          );
        }
        if (provider.status !== "EXPIRED") {
          return errorResponse(c, 409, "PAYMENT_CANCELLATION_PENDING", "Payment is still pending");
        }
        providerExpired = true;
      } catch (error) {
        if (!(error instanceof FapshiProviderError) || error.status !== 400) {
          return errorResponse(c, 502, "PROVIDER_UNAVAILABLE", "Payment provider unavailable");
        }

        try {
          const provider = await getFapshiPaymentStatus(payment.providerTransId);
          if (provider.status === "SUCCESSFUL") {
            const settlement = await applyFapshiPaymentStatus({ payload: provider });
            return errorResponse(
              c,
              409,
              settlement.type === "amount-verification-failed"
                ? "PAYMENT_UNDER_REVIEW"
                : "REGISTRATION_ALREADY_PAID",
              "Payment status changed before cancellation",
            );
          }
          if (provider.status !== "EXPIRED") {
            return errorResponse(
              c,
              409,
              "PAYMENT_CANCELLATION_PENDING",
              "Payment is still pending",
            );
          }
          providerExpired = true;
        } catch {
          return errorResponse(c, 502, "PROVIDER_UNAVAILABLE", "Payment provider unavailable");
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sessionRegistration.findUnique({ where: { id } });
      if (!existing) return { type: "not-found" as const };
      if (existing.userId !== user.id) return { type: "forbidden" as const };
      if (existing.status === SessionRegistrationStatus.PAID) return { type: "paid" as const };
      if (existing.status !== SessionRegistrationStatus.PAYMENT_PENDING) {
        return { type: "not-cancellable" as const };
      }

      const cancellationTime = new Date();
      const registrationUpdate = await tx.sessionRegistration.updateMany({
        where: { id, userId: user.id, status: SessionRegistrationStatus.PAYMENT_PENDING },
        data: {
          status: SessionRegistrationStatus.CANCELLED,
          cancelledAt: cancellationTime,
          cancellationReason: input.reason ?? "player-cancelled-before-payment",
        },
      });

      if (registrationUpdate.count !== 1) {
        const current = await tx.sessionRegistration.findUnique({ where: { id } });
        return current?.status === SessionRegistrationStatus.PAID
          ? { type: "paid" as const }
          : { type: "not-cancellable" as const };
      }

      if (providerExpired && payment) {
        await tx.paymentTransaction.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: {
            status: PaymentStatus.EXPIRED,
            providerStatus: "EXPIRED",
          },
        });
      }

      const updated = await tx.sessionRegistration.findUniqueOrThrow({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "registration.cancelled",
          entity: "SessionRegistration",
          entityId: id,
          reason: input.reason,
          oldData: serializeRegistration(existing),
          newData: serializeRegistration(updated),
        },
      });

      return { type: "ok" as const, registration: updated };
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "REGISTRATION_NOT_FOUND", "Registration not found");
    }
    if (result.type === "forbidden") {
      return errorResponse(
        c,
        403,
        "REGISTRATION_FORBIDDEN",
        "Registration belongs to another user",
      );
    }
    if (result.type === "paid") {
      return errorResponse(
        c,
        409,
        "REGISTRATION_ALREADY_PAID",
        "Paid registrations cannot be cancelled here",
      );
    }
    if (result.type === "not-cancellable") {
      return errorResponse(
        c,
        409,
        "REGISTRATION_NOT_CANCELLABLE",
        "Registration cannot be cancelled",
      );
    }

    return successResponse(c, { registration: serializeRegistration(result.registration) });
  },
);

export default registrations;
