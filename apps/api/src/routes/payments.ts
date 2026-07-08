import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@session-jeu/db";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { createRiskSignal } from "../security/security.js";
import {
  applyFapshiPaymentStatus,
  fapshiWebhookSchema,
  initiateFapshiSchema,
  initiatePaymentForRegistration,
  paymentIdParamsSchema,
  serializePayment,
} from "../payments/fapshi.js";

const payments = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

payments.post(
  "/payments/fapshi/initiate",
  rateLimit({ scope: "payment-initiate", limit: 20, windowMs: 60_000 }),
  requireAuth,
  zValidator("json", initiateFapshiSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const result = await initiatePaymentForRegistration({
      userId: user.id,
      registrationId: input.registrationId,
      redirectUrl: input.redirectUrl,
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
    if (result.type === "expired") {
      return errorResponse(c, 409, "REGISTRATION_EXPIRED", "Registration is expired");
    }
    if (result.type === "not-pending") {
      return errorResponse(
        c,
        409,
        "REGISTRATION_NOT_PENDING",
        "Registration is not pending payment",
      );
    }
    if (result.type === "amount-too-low") {
      return errorResponse(c, 400, "PAYMENT_AMOUNT_TOO_LOW", "Amount is below Fapshi minimum");
    }
    if (result.type === "provider-unavailable") {
      return errorResponse(c, 502, "PROVIDER_UNAVAILABLE", "Payment provider unavailable");
    }
    if (result.type === "existing") {
      return successResponse(c, { payment: serializePayment(result.payment) });
    }

    return successResponse(
      c,
      {
        payment: serializePayment(result.payment),
        checkoutUrl: result.payment.checkoutUrl,
      },
      201,
    );
  },
);

payments.get(
  "/payments/:id/status",
  requireAuth,
  zValidator("param", paymentIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const payment = await prisma.paymentTransaction.findUnique({ where: { id } });

    if (!payment) return errorResponse(c, 404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (payment.userId !== user.id) {
      return errorResponse(c, 403, "PAYMENT_FORBIDDEN", "Payment belongs to another user");
    }

    return successResponse(c, { payment: serializePayment(payment) });
  },
);

payments.post(
  "/webhooks/fapshi",
  zValidator("json", fapshiWebhookSchema, validationHook),
  async (c) => {
    const expectedSecret = process.env.FAPSHI_WEBHOOK_SECRET;
    const providedSecret = c.req.header("x-wh-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      await createRiskSignal({
        type: "WEBHOOK_SIGNATURE_FAILURE",
        severity: "HIGH",
        source: "fapshi-webhook",
        ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip"),
        reason: "invalid x-wh-secret",
        metadata: { provider: "fapshi" },
      }).catch(() => undefined);
      return errorResponse(c, 401, "INVALID_WEBHOOK_SECRET", "Invalid webhook secret");
    }

    const payload = c.req.valid("json");
    const result = await applyFapshiPaymentStatus({ payload });
    return successResponse(c, { received: true, result: result.type });
  },
);

export default payments;
