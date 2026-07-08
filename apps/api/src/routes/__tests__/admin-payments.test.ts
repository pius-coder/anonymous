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
    auditLog: {
      create: vi.fn(),
    },
  },
}));

const queueMocks = vi.hoisted(() => ({
  schedulePaymentReconciliation: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

vi.mock("../../queues/paymentReconciliation.js", () => queueMocks);

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { requestId } from "../../middleware/requestId.js";
import adminPayments from "../admin/payments.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("*", requestId);
  app.route("/v1/admin/payments", adminPayments);
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

describe("admin payment routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue({ id: "payment-1" });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
    queueMocks.schedulePaymentReconciliation.mockResolvedValue(undefined);
  });

  it("allows finance role to queue manual reconciliation", async () => {
    const res = await app.request("/v1/admin/payments/payment-1/reconcile", {
      method: "POST",
      body: JSON.stringify({ reason: "manual reconciliation requested" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "x-request-id": "req-payment",
      },
    });

    expect(res.status).toBe(200);
    expect(queueMocks.schedulePaymentReconciliation).toHaveBeenCalledWith({
      paymentId: "payment-1",
      delayMs: 0,
    });
    expect(dbMocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "finance-1",
        action: "payment.reconciliation-queued",
        entity: "PaymentTransaction",
        entityId: "payment-1",
        reason: "manual reconciliation requested",
        requestId: "req-payment",
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  });

  it("requires a reason for manual reconciliation", async () => {
    const res = await app.request("/v1/admin/payments/payment-1/reconcile", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(400);
    expect(queueMocks.schedulePaymentReconciliation).not.toHaveBeenCalled();
  });

  it("returns 404 when manual reconciliation targets an unknown payment", async () => {
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue(null);

    const res = await app.request("/v1/admin/payments/payment-1/reconcile", {
      method: "POST",
      body: JSON.stringify({ reason: "manual reconciliation requested" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(404);
    expect(queueMocks.schedulePaymentReconciliation).not.toHaveBeenCalled();
  });

  it("rejects non-finance admin role", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("ADMIN"));

    const res = await app.request("/v1/admin/payments/payment-1/reconcile", {
      method: "POST",
      body: JSON.stringify({ reason: "manual reconciliation requested" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(403);
    expect(queueMocks.schedulePaymentReconciliation).not.toHaveBeenCalled();
  });
});
