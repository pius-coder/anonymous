import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { registrationIdParamsSchema } from "../registrations/sessionRegistration.js";
import {
  getWalletForUser,
  listWalletLedger,
  payRegistrationWithWallet,
  payWithWalletSchema,
  serializeLedgerEntry,
  serializeRegistrationPaymentResult,
  serializeWallet,
  walletLedgerQuerySchema,
} from "../wallet/wallet.js";

const wallet = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

wallet.get("/wallet/me", requireAuth, async (c) => {
  const user = c.get("user");
  const result = await getWalletForUser(user.id);

  return successResponse(c, {
    wallet: serializeWallet(result.wallet),
    ledgerBalanceXaf: result.ledgerBalanceXaf,
    isLedgerAligned: result.isLedgerAligned,
  });
});

wallet.get(
  "/wallet/me/ledger",
  requireAuth,
  zValidator("query", walletLedgerQuerySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const result = await listWalletLedger({
      userId: user.id,
      cursor: query.cursor,
      limit: query.limit,
    });

    return successResponse(c, {
      wallet: result.wallet ? serializeWallet(result.wallet) : null,
      entries: result.entries.map(serializeLedgerEntry),
      nextCursor: result.nextCursor,
    });
  },
);

wallet.post(
  "/registrations/:id/pay-with-wallet",
  rateLimit({ scope: "wallet-payment", limit: 20, windowMs: 60_000 }),
  requireAuth,
  zValidator("param", registrationIdParamsSchema, validationHook),
  zValidator("json", payWithWalletSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const result = await payRegistrationWithWallet({
      userId: user.id,
      registrationId: id,
      idempotencyKey: input.idempotencyKey,
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
      return errorResponse(c, 409, "REGISTRATION_EXPIRED", "Registration payment deadline passed");
    }
    if (result.type === "already-paid") {
      return errorResponse(c, 409, "REGISTRATION_ALREADY_PAID", "Registration is already paid");
    }
    if (result.type === "not-payable") {
      return errorResponse(c, 409, "REGISTRATION_NOT_PAYABLE", "Registration cannot be paid");
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
        registration: serializeRegistrationPaymentResult(result.registration),
      },
      result.type === "idempotent" ? 200 : 201,
    );
  },
);

wallet.post("/wallet/me/withdraw", requireAuth, (c) =>
  errorResponse(c, 403, "WITHDRAWALS_DISABLED", "Real-money withdrawals are disabled in V1"),
);

export default wallet;
