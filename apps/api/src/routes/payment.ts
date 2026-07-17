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
  purpose: z.enum(["ACCESS_FEE", "TOP_UP"]).optional().default("ACCESS_FEE"),
  productCode: z.string().min(1).optional(),
  currency: z.string().optional(),
  /** Client may send amount for TOP_UP only; ACCESS_FEE always uses server catalog. */
  amount: z.number().positive().optional(),
  idempotencyKey: z.string().min(8),
  partyId: z.string().min(1).optional(),
  participationId: z.string().min(1).optional(),
});

const webhookSchema = z.object({
  transactionId: z.string().min(1),
  status: z.enum(["SUCCESS", "SUCCESSFUL", "FAILED", "PENDING", "EXPIRED"]),
  providerReference: z.string().min(1),
  signature: z.string().min(1),
  externalEventId: z.string().min(1).optional(),
  providerTransId: z.string().min(1).optional(),
});

const payWithWalletSchema = z.object({
  purpose: z.enum(["ACCESS_FEE"]).optional().default("ACCESS_FEE"),
  productCode: z.string().min(1).optional(),
  reason: z.string().min(1),
  /** Optional client hint — ignored for ACCESS_FEE (server amount). */
  amount: z.number().positive().optional(),
  idempotencyKey: z.string().min(8),
  partyId: z.string().min(1).optional(),
  participationId: z.string().min(1).optional(),
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
    const result = await initiatePayment({
      userId: user.id,
      purpose: input.purpose,
      productCode: input.productCode,
      currency: input.currency,
      requestedAmount: input.amount,
      idempotencyKey: input.idempotencyKey,
      partyId: input.partyId,
      participationId: input.participationId,
    });
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
      externalEventId: payload.externalEventId,
      providerTransId: payload.providerTransId,
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
    const result = await payWithWallet({
      userId: user.id,
      purpose: input.purpose,
      productCode: input.productCode,
      reason: input.reason,
      requestedAmount: input.amount,
      idempotencyKey: input.idempotencyKey,
      partyId: input.partyId,
      participationId: input.participationId,
    });
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
