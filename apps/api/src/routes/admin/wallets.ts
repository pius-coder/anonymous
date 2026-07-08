import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  adjustWallet,
  adminWalletAdjustmentSchema,
  serializeLedgerEntry,
  serializeWallet,
  userIdParamsSchema,
} from "../../wallet/wallet.js";

const adminWallets = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminWallets.post(
  "/:userId/adjust",
  requireAuth,
  requireRole("FINANCE", "SUPER_ADMIN"),
  zValidator("param", userIdParamsSchema, validationHook),
  zValidator("json", adminWalletAdjustmentSchema, validationHook),
  async (c) => {
    const adminUser = c.get("user");
    const { userId } = c.req.valid("param");
    const input = c.req.valid("json");

    const result = await adjustWallet({
      adminUserId: adminUser.id,
      targetUserId: userId,
      amountXaf: input.amountXaf,
      direction: input.direction,
      type: input.type,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    });

    if (result.type === "user-not-found") {
      return errorResponse(c, 404, "USER_NOT_FOUND", "User was not found");
    }
    if (result.type === "wallet-frozen") {
      return errorResponse(c, 409, "WALLET_FROZEN", "Wallet is frozen");
    }
    if (result.type === "insufficient-funds") {
      return errorResponse(c, 409, "INSUFFICIENT_FUNDS", "Wallet balance is insufficient");
    }
    if (result.type === "ledger-duplicate") {
      return errorResponse(c, 409, "LEDGER_DUPLICATE", "Ledger idempotency key is already used");
    }

    return successResponse(
      c,
      {
        wallet: serializeWallet(result.wallet),
        ledgerEntry: serializeLedgerEntry(result.ledger),
      },
      result.type === "idempotent" ? 200 : 201,
    );
  },
);

export default adminWallets;
