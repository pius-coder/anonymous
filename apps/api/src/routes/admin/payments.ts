import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma, PaymentStatus, Prisma } from "@session-jeu/db";
import {
  getClientIp,
  getRequestId,
  getUserAgent,
  requireAuth,
  requireRole,
} from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { paymentIdParamsSchema } from "../../payments/fapshi.js";
import { schedulePaymentReconciliation } from "../../queues/paymentReconciliation.js";

const adminPayments = new Hono<{ Variables: AuthVariables }>();

const financeRead = [requireAuth, requireRole("FINANCE", "SUPER_ADMIN", "ADMIN", "SUPPORT")] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "SUCCESSFUL", "FAILED", "EXPIRED", "REFUNDED"]).optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminPayments.get(
  "/",
  ...financeRead,
  zValidator("query", listQuerySchema, validationHook),
  async (c) => {
    const { page, limit, status, sessionId, userId } = c.req.valid("query");
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentTransactionWhereInput = {};
    if (status) where.status = status as PaymentStatus;
    if (sessionId) where.sessionId = sessionId;
    if (userId) where.userId = userId;

    const [total, payments] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { registration: { select: { id: true, status: true } } },
      }),
    ]);

    const [users, sessions] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: [...new Set(payments.map((p) => p.userId))] } },
        select: { id: true, email: true, name: true },
      }),
      prisma.gameSession.findMany({
        where: { id: { in: [...new Set(payments.flatMap((p) => (p.sessionId ? [p.sessionId] : [])))] } },
        select: { id: true, code: true, name: true },
      }),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const sessionsById = new Map(sessions.map((session) => [session.id, session]));

    const data = payments.map((p) => ({
      id: p.id,
      session: p.sessionId ? (sessionsById.get(p.sessionId) ?? null) : null,
      user: usersById.get(p.userId) ?? { id: p.userId, email: "", name: null },
      amountXaf: p.amountXaf,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerTransId: p.providerTransId,
      providerExternalId: p.providerExternalId,
      registrationStatus: p.registration?.status ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return successResponse(c, {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  },
);

const reconcilePaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

adminPayments.post(
  "/:id/reconcile",
  requireAuth,
  requireRole("FINANCE", "SUPER_ADMIN"),
  zValidator("param", paymentIdParamsSchema, validationHook),
  zValidator("json", reconcilePaymentSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const user = c.get("user");
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!payment) {
      return errorResponse(c, 404, "PAYMENT_NOT_FOUND", "Payment was not found");
    }

    await schedulePaymentReconciliation({ paymentId: id, delayMs: 0 });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "payment.reconciliation-queued",
        entity: "PaymentTransaction",
        entityId: id,
        reason: body.reason,
        requestId: getRequestId(c),
        ipAddress: getClientIp(c),
        userAgent: getUserAgent(c),
      },
    });

    return successResponse(c, { queued: true, paymentId: id });
  },
);

export default adminPayments;
