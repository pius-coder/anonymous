import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permission.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import {
  listAllTransactions,
  getPaymentStatus,
  reconcilePayment,
  PaymentUseCaseError,
} from "../../use-cases/payment/payment.use-case.js";
import {
  expirePaymentCommand,
  requestCompensation,
  decideCompensation,
  financePayoutCommand,
  buildDailyFinanceReport,
  listFinanceMismatches,
  listFinanceWallets,
  reconcileAgainstProvider,
} from "../../use-cases/payment/finance.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const adminPaymentRouter = new Hono<AppEnv>();

/** FINANCE (+ SUPER_ADMIN via MANAGE_PAYMENTS). ADMIN and SUPPORT are denied. */
const FINANCE_PERM = requirePermission("MANAGE_PAYMENTS");

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  status: z.string().optional(),
});

const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

const reconcileBodySchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

const expireBodySchema = z.object({
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8),
});

const compensationRequestSchema = z.object({
  reason: z.string().min(1).max(500),
  amount: z.number().positive().optional(),
  beneficiaryPhone: z.string().min(8).optional(),
  beneficiaryEmail: z.string().email().optional(),
  beneficiaryVerified: z.boolean(),
  idempotencyKey: z.string().min(8),
});

const compensationDecideSchema = z.object({
  decision: z.enum(["APPROVED_PAYOUT", "APPROVED_MANUAL", "REJECTED", "OUT_OF_SCOPE"]),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8),
});

const payoutBodySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  beneficiaryPhone: z.string().min(8).optional(),
  beneficiaryEmail: z.string().email().optional(),
  beneficiaryVerified: z.boolean(),
  /** Caller must affirm scores were published — server refuses if false. */
  scoresPublished: z.boolean(),
  idempotencyKey: z.string().min(8),
});

function stepUpFrom(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("x-finance-step-up") ?? c.req.header("X-Finance-Step-Up");
}

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PaymentUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin payment error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminPaymentRouter.get(
  "/payments",
  requireAuth,
  FINANCE_PERM,
  zValidator("query", paginationSchema),
  async (c) => {
    try {
      const { skip, take, status } = c.req.valid("query");
      const result = await listAllTransactions({ skip, take, status });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.get(
  "/payments/:id",
  requireAuth,
  FINANCE_PERM,
  zValidator("param", paymentIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await getPaymentStatus(id);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.post(
  "/payments/:id/reconcile",
  requireAuth,
  FINANCE_PERM,
  zValidator("param", paymentIdParamSchema),
  auditLog("PAYMENT_RECONCILE", "PaymentTransaction"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      let reason: string | undefined;
      try {
        const raw = await c.req.json();
        const parsed = reconcileBodySchema.safeParse(raw ?? {});
        if (parsed.success) reason = parsed.data.reason;
      } catch {
        // empty body allowed for legacy reconcile
      }
      // Prefer provider-backed recon; fall back to local terminal mark.
      try {
        const provider = await reconcileAgainstProvider(id);
        if (provider.action === "NEEDS_SETTLEMENT" || provider.action === "MISMATCH") {
          return successResponse(c, provider);
        }
        if (provider.match) {
          return successResponse(c, provider);
        }
      } catch {
        // fall through
      }
      const result = await reconcilePayment(id, user.id, reason);
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.post(
  "/payments/:id/expire",
  requireAuth,
  FINANCE_PERM,
  zValidator("param", paymentIdParamSchema),
  zValidator("json", expireBodySchema),
  auditLog("PAYMENT_EXPIRE", "PaymentTransaction"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await expirePaymentCommand({
        paymentId: id,
        actorUserId: user.id,
        stepUpToken: stepUpFrom(c),
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.post(
  "/payments/:id/compensation",
  requireAuth,
  FINANCE_PERM,
  zValidator("param", paymentIdParamSchema),
  zValidator("json", compensationRequestSchema),
  auditLog("COMPENSATION_REQUEST", "PaymentReconciliation"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await requestCompensation({
        paymentId: id,
        actorUserId: user.id,
        stepUpToken: stepUpFrom(c),
        reason: body.reason,
        amount: body.amount,
        beneficiaryPhone: body.beneficiaryPhone,
        beneficiaryEmail: body.beneficiaryEmail,
        beneficiaryVerified: body.beneficiaryVerified,
        idempotencyKey: body.idempotencyKey,
      });
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.post(
  "/compensations/:id/decide",
  requireAuth,
  FINANCE_PERM,
  zValidator("param", paymentIdParamSchema),
  zValidator("json", compensationDecideSchema),
  auditLog("COMPENSATION_DECIDE", "PaymentReconciliation"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await decideCompensation({
        reconciliationId: id,
        actorUserId: user.id,
        stepUpToken: stepUpFrom(c),
        decision: body.decision,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.post(
  "/payouts",
  requireAuth,
  FINANCE_PERM,
  zValidator("json", payoutBodySchema),
  auditLog("FINANCE_PAYOUT", "PaymentTransaction"),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await financePayoutCommand({
        userId: body.userId,
        amount: body.amount,
        actorUserId: user.id,
        stepUpToken: stepUpFrom(c),
        reason: body.reason,
        beneficiaryPhone: body.beneficiaryPhone,
        beneficiaryEmail: body.beneficiaryEmail,
        beneficiaryVerified: body.beneficiaryVerified,
        scoresPublished: body.scoresPublished,
        idempotencyKey: body.idempotencyKey,
      });
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPaymentRouter.get("/mismatches", requireAuth, FINANCE_PERM, async (c) => {
  try {
    const skip = Number(c.req.query("skip") ?? 0);
    const take = Number(c.req.query("take") ?? 50);
    const result = await listFinanceMismatches({ skip, take });
    return successResponse(c, { mismatches: result });
  } catch (err) {
    return handleError(c, err);
  }
});

adminPaymentRouter.get("/report/daily", requireAuth, FINANCE_PERM, async (c) => {
  try {
    const result = await buildDailyFinanceReport();
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPaymentRouter.get("/wallets", requireAuth, FINANCE_PERM, async (c) => {
  try {
    const skip = Number(c.req.query("skip") ?? 0);
    const take = Number(c.req.query("take") ?? 50);
    const result = await listFinanceWallets({ skip, take });
    return successResponse(c, { wallets: result });
  } catch (err) {
    return handleError(c, err);
  }
});

adminPaymentRouter.get("/export/transactions", requireAuth, FINANCE_PERM, async (c) => {
  try {
    const result = await listAllTransactions({ skip: 0, take: 500 });
    const report = await buildDailyFinanceReport();
    return successResponse(c, {
      exportedAt: new Date().toISOString(),
      report,
      transactions: result.transactions,
      total: result.total,
      status: "OK",
    });
  } catch (err) {
    return handleError(c, err);
  }
});

export { adminPaymentRouter };
