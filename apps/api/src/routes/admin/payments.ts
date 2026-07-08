import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@session-jeu/db";
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

const reconcilePaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

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
