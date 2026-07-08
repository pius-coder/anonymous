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
  getWalletForUser: vi.fn(),
  listWalletLedger: vi.fn(),
  payRegistrationWithWallet: vi.fn(),
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
import walletRoutes from "../wallet.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", walletRoutes);
  return app;
}

function validAuthSession(userId = "player-1") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: userId,
      email: `${userId}@example.com`,
      name: "Player",
      role: "PLAYER",
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function wallet(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "wallet-1",
    userId: "player-1",
    balanceXaf: 1500,
    currency: "XAF",
    isFrozen: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function ledger(overrides: Record<string, unknown> = {}) {
  return {
    id: "ledger-1",
    walletId: "wallet-1",
    userId: "player-1",
    amountXaf: 1000,
    balanceAfterXaf: 500,
    direction: "DEBIT",
    type: "ENTRY_FEE",
    description: "Wallet payment for session registration",
    referenceType: "SessionRegistration",
    referenceId: "registration-1",
    idempotencyKey: "idem-12345678",
    paymentId: null,
    sessionId: "session-1",
    createdAt: new Date("2026-07-08T00:00:00Z"),
    ...overrides,
  };
}

function registration(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAID",
    paymentDeadlineAt: new Date("2026-07-08T00:15:00Z"),
    paidAt: now,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("wallet routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    walletMocks.getWalletForUser.mockResolvedValue({
      wallet: wallet(),
      ledgerBalanceXaf: 1500,
      isLedgerAligned: true,
    });
    walletMocks.listWalletLedger.mockResolvedValue({
      wallet: wallet(),
      entries: [ledger()],
      nextCursor: null,
    });
    walletMocks.payRegistrationWithWallet.mockResolvedValue({
      type: "ok",
      wallet: wallet({ balanceXaf: 500 }),
      ledger: ledger(),
      registration: registration(),
    });
  });

  it("returns current player's wallet", async () => {
    const res = await app.request("/v1/wallet/me", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(walletMocks.getWalletForUser).toHaveBeenCalledWith("player-1");
  });

  it("returns paginated current player's ledger", async () => {
    const res = await app.request("/v1/wallet/me/ledger?limit=10", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(walletMocks.listWalletLedger).toHaveBeenCalledWith({
      userId: "player-1",
      cursor: undefined,
      limit: 10,
    });
  });

  it("pays a registration with wallet credits", async () => {
    const res = await app.request("/v1/registrations/registration-1/pay-with-wallet", {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: "idem-12345678" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(walletMocks.payRegistrationWithWallet).toHaveBeenCalledWith({
      userId: "player-1",
      registrationId: "registration-1",
      idempotencyKey: "idem-12345678",
    });
  });

  it("refuses wallet payment with insufficient funds", async () => {
    walletMocks.payRegistrationWithWallet.mockResolvedValue({ type: "insufficient-funds" });

    const res = await app.request("/v1/registrations/registration-1/pay-with-wallet", {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: "idem-12345678" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INSUFFICIENT_FUNDS");
  });

  it("blocks real-money withdrawals in V1", async () => {
    const res = await app.request("/v1/wallet/me/withdraw", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("WITHDRAWALS_DISABLED");
  });
});
