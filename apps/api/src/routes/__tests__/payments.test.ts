import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentTransaction: {
      findUnique: vi.fn(),
    },
  },
}));

const paymentMocks = vi.hoisted(() => ({
  initiatePaymentForRegistration: vi.fn(),
  applyFapshiPaymentStatus: vi.fn(),
  serializePayment: vi.fn((payment) => payment),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  PaymentStatus: {
    PENDING: "PENDING",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
    REFUNDED: "REFUNDED",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../payments/fapshi.js", async () => {
  const actual = await vi.importActual<typeof import("../../payments/fapshi.js")>(
    "../../payments/fapshi.js",
  );
  return {
    ...actual,
    ...paymentMocks,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import payments from "../payments.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", payments);
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

function payment(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "payment-1",
    userId: "player-1",
    status: "PENDING",
    checkoutUrl: "https://checkout.example/pay",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("payment routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FAPSHI_WEBHOOK_SECRET = "webhook-secret";
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    paymentMocks.initiatePaymentForRegistration.mockResolvedValue({
      type: "ok",
      payment: payment(),
    });
    paymentMocks.applyFapshiPaymentStatus.mockResolvedValue({ type: "processed" });
  });

  it("initiates a Fapshi payment for authenticated player", async () => {
    const res = await app.request("/v1/payments/fapshi/initiate", {
      method: "POST",
      body: JSON.stringify({ registrationId: "registration-1" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(paymentMocks.initiatePaymentForRegistration).toHaveBeenCalledWith({
      userId: "player-1",
      registrationId: "registration-1",
      redirectUrl: undefined,
    });
  });

  it("rejects invalid Fapshi webhook secret", async () => {
    const res = await app.request("/v1/webhooks/fapshi", {
      method: "POST",
      body: JSON.stringify({ transId: "trans-1", status: "SUCCESSFUL" }),
      headers: {
        "content-type": "application/json",
        "x-wh-secret": "wrong",
      },
    });

    expect(res.status).toBe(401);
    expect(paymentMocks.applyFapshiPaymentStatus).not.toHaveBeenCalled();
  });

  it("accepts valid Fapshi webhook and returns quickly", async () => {
    const res = await app.request("/v1/webhooks/fapshi", {
      method: "POST",
      body: JSON.stringify({ transId: "trans-1", status: "SUCCESSFUL", amount: 1000 }),
      headers: {
        "content-type": "application/json",
        "x-wh-secret": "webhook-secret",
      },
    });

    expect(res.status).toBe(200);
    expect(paymentMocks.applyFapshiPaymentStatus).toHaveBeenCalledWith({
      payload: { transId: "trans-1", status: "SUCCESSFUL", amount: 1000 },
    });
  });

  it("returns own payment status", async () => {
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue(payment());

    const res = await app.request("/v1/payments/payment-1/status", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
  });

  it("forbids reading another player's payment", async () => {
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue(
      payment({ userId: "other-player" }),
    );

    const res = await app.request("/v1/payments/payment-1/status", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
  });
});
