import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const walletMocks = vi.hoisted(() => ({
  adjustWallet: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  LedgerDirection: {
    CREDIT: "CREDIT",
    DEBIT: "DEBIT",
  },
  LedgerType: {
    ENTRY_FEE: "ENTRY_FEE",
    PRIZE: "PRIZE",
    REFUND: "REFUND",
    BONUS: "BONUS",
    ADJUSTMENT: "ADJUSTMENT",
  },
  SessionRegistrationStatus: {
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../wallet/wallet.js", async () => {
  const actual =
    await vi.importActual<typeof import("../../wallet/wallet.js")>("../../wallet/wallet.js");
  return {
    ...actual,
    ...walletMocks,
  };
});

vi.mock("../../queues/registrationExpiration.js", () => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminWallets from "../admin/wallets.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin/wallets", adminWallets);
  return app;
}

function validAuthSession(role: "PLAYER" | "ADMIN" | "FINANCE" | "SUPER_ADMIN" = "FINANCE") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: "finance-1",
      email: "finance@example.com",
      name: "Finance",
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function wallet() {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "wallet-1",
    userId: "player-1",
    balanceXaf: 2000,
    currency: "XAF",
    isFrozen: false,
    version: 2,
    createdAt: now,
    updatedAt: now,
  };
}

function ledger() {
  return {
    id: "ledger-1",
    walletId: "wallet-1",
    userId: "player-1",
    amountXaf: 500,
    balanceAfterXaf: 2000,
    direction: "CREDIT",
    type: "ADJUSTMENT",
    description: "manual correction",
    referenceType: "AdminAdjustment",
    referenceId: null,
    idempotencyKey: "admin-12345678",
    paymentId: null,
    sessionId: null,
    createdAt: new Date("2026-07-08T00:00:00Z"),
  };
}

describe("admin wallet routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    walletMocks.adjustWallet.mockResolvedValue({
      type: "ok",
      wallet: wallet(),
      ledger: ledger(),
    });
  });

  it("allows finance to adjust a wallet with a reason", async () => {
    const res = await app.request("/v1/admin/wallets/player-1/adjust", {
      method: "POST",
      body: JSON.stringify({
        amountXaf: 500,
        direction: "CREDIT",
        reason: "manual correction",
        idempotencyKey: "admin-12345678",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(walletMocks.adjustWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "finance-1",
        targetUserId: "player-1",
        amountXaf: 500,
        reason: "manual correction",
      }),
    );
  });

  it("requires adjustment reason", async () => {
    const res = await app.request("/v1/admin/wallets/player-1/adjust", {
      method: "POST",
      body: JSON.stringify({
        amountXaf: 500,
        direction: "CREDIT",
        idempotencyKey: "admin-12345678",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(400);
    expect(walletMocks.adjustWallet).not.toHaveBeenCalled();
  });

  it("rejects non-finance admin role", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("ADMIN"));

    const res = await app.request("/v1/admin/wallets/player-1/adjust", {
      method: "POST",
      body: JSON.stringify({
        amountXaf: 500,
        direction: "CREDIT",
        reason: "manual correction",
        idempotencyKey: "admin-12345678",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(403);
    expect(walletMocks.adjustWallet).not.toHaveBeenCalled();
  });
});
