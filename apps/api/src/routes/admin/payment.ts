import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import {
  listAllTransactions,
  getPaymentStatus,
  reconcilePayment,
  PaymentUseCaseError,
} from "../../use-cases/payment/payment.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const adminPaymentRouter = new Hono<AppEnv>();

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  status: z.string().optional(),
});

const paymentIdParamSchema = z.object({
  id: z.string().min(1),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PaymentUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin payment error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminPaymentRouter.get("/payments", requireAuth, requireRole("FINANCE", "ADMIN", "SUPER_ADMIN"), zValidator("query", paginationSchema), async (c) => {
  try {
    const { skip, take, status } = c.req.valid("query");
    const result = await listAllTransactions({ skip, take, status });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPaymentRouter.get("/payments/:id", requireAuth, requireRole("FINANCE", "ADMIN", "SUPER_ADMIN"), zValidator("param", paymentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const result = await getPaymentStatus(id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPaymentRouter.post("/payments/:id/reconcile", requireAuth, requireRole("FINANCE", "ADMIN", "SUPER_ADMIN"), zValidator("param", paymentIdParamSchema), auditLog("PAYMENT_RECONCILE", "PaymentTransaction"), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const result = await reconcilePayment(id, user.id);
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { adminPaymentRouter };
