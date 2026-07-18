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
  listMyPayments,
  getTransactionDetail,
  exportMyTransactions,
  getWalletMetrics,
  PaymentUseCaseError,
} from "../use-cases/payment/payment.use-case.js";
import { requireAuth } from "../middleware/auth.js";
import type { StatusCode } from "hono/utils/http-status";

const paymentRouter = new Hono<AppEnv>();

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const initiatePaymentSchema = z.object({
  purpose: z.enum(["ACCESS_FEE", "TOP_UP"]).optional().default("ACCESS_FEE"),
  productCode: z.string().min(1).optional(),
  currency: z.string().optional(),
  /** Client may send amount for TOP_UP only; ACCESS_FEE always uses server catalog. */
  amount: z.number().positive().optional(),
  idempotencyKey: z.string().min(8),
  // Client redirectUrl is intentionally rejected — server builds redirectUrl.
  partyId: z.string().min(1).optional(),
  participationId: z.string().min(1).optional(),
});

/** Official Fapshi webhook payload (same shape as payment-status). */
const fapshiWebhookBodySchema = z
  .object({
    transId: z.string().min(1),
    status: z.enum(["CREATED", "PENDING", "SUCCESSFUL", "FAILED", "EXPIRED"]),
    amount: z.number().int().optional(),
    externalId: z.string().optional(),
    userId: z.string().optional(),
  })
  .passthrough();

const payWithWalletSchema = z.object({
  purpose: z.enum(["ACCESS_FEE"]).optional().default("ACCESS_FEE"),
  productCode: z.string().min(1).optional(),
  reason: z.string().min(1),
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
  console.error("Unexpected payment error:", err instanceof Error ? err.message : "unknown");
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

paymentRouter.post(
  "/payments/initiate",
  requireAuth,
  zValidator("json", initiatePaymentSchema),
  async (c) => {
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
        email: user.email,
        partyId: input.partyId,
        participationId: input.participationId,
      });
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

/**
 * Fapshi webhook — header x-wh-secret required.
 * ACK quickly after durable inbox write; settlement uses payment-status verify.
 */
paymentRouter.post("/payments/webhook/fapshi", async (c) => {
  try {
    const webhookSecretHeader = c.req.header("x-wh-secret") ?? undefined;
    const raw = await c.req.json().catch(() => null);
    const parsed = fapshiWebhookBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(
        c,
        400 as StatusCode,
        "INVALID_ARGUMENT",
        "Corps webhook Fapshi invalide",
      );
    }
    const result = await handlePaymentWebhook({
      webhookSecretHeader,
      body: parsed.data,
      processSync: false,
    });
    return successResponse(c, result, 200);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.post(
  "/payments/wallet/pay",
  requireAuth,
  zValidator("json", payWithWalletSchema),
  async (c) => {
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
  },
);

paymentRouter.get(
  "/payments/:id/status",
  requireAuth,
  zValidator("param", paymentIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const result = await getPaymentStatus(id, user.id);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

paymentRouter.get("/wallet", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const result = await getMyWallet(user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.get(
  "/wallet/ledger",
  requireAuth,
  zValidator("query", paginationSchema),
  async (c) => {
    try {
      const { skip, take } = c.req.valid("query");
      const user = c.get("user");
      const result = await listMyLedger(user.id, skip, take);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

paymentRouter.get(
  "/wallet/transactions",
  requireAuth,
  zValidator("query", paginationSchema),
  async (c) => {
    try {
      const { skip, take } = c.req.valid("query");
      const user = c.get("user");
      const result = await listMyPayments(user.id, skip, take);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

paymentRouter.get(
  "/wallet/transactions/:id",
  requireAuth,
  zValidator("param", paymentIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const result = await getTransactionDetail(id, user.id);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

paymentRouter.get("/wallet/export", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const result = await exportMyTransactions(user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

paymentRouter.get("/wallet/metrics", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const result = await getWalletMetrics(user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { paymentRouter };
