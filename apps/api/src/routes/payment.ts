import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { successResponse, errorResponse } from "../lib/responses.js";
import {
  initiatePayment,
  handlePaymentWebhook,
  payWithWallet,
  getPaymentStatus,
  getMyWallet,
  listMyLedger,
  PaymentUseCaseError,
} from "../use-cases/payment/payment.use-case.js";
import { requireAuth } from "../middleware/auth.js";
import type { StatusCode } from "hono/utils/http-status";

const paymentRouter = new Hono<AppEnv>();

const initiatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const webhookSchema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]),
  providerReference: z.string().min(1),
  signature: z.string().min(1),
});

const payWithWalletSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PaymentUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected payment error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

paymentRouter.post("/payments/initiate", requireAuth, zValidator("json", initiatePaymentSchema), async (c) => {
  try {
    const input = c.req.valid("json");
    const user = c.get("user");
    const result = await initiatePayment({ userId: user.id, ...input });
    return successResponse(c, result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.post("/payments/webhook/fapshi", zValidator("json", webhookSchema), async (c) => {
  try {
    const payload = c.req.valid("json");
    const result = await handlePaymentWebhook({
      transactionId: payload.transactionId,
      status: payload.status,
      providerReference: payload.providerReference,
      signature: payload.signature,
    });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.post("/payments/wallet/pay", requireAuth, zValidator("json", payWithWalletSchema), async (c) => {
  try {
    const input = c.req.valid("json");
    const user = c.get("user");
    const result = await payWithWallet({ userId: user.id, amount: input.amount, reason: input.reason, idempotencyKey: input.idempotencyKey });
    return successResponse(c, result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.get("/payments/:id/status", requireAuth, zValidator("param", paymentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const result = await getPaymentStatus(id, user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.get("/wallet", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const result = await getMyWallet(user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.get("/wallet/ledger", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const result = await listMyLedger(user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { paymentRouter };
