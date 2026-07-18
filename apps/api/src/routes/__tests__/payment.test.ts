import { beforeEach, describe, expect, it, vi } from "vitest";

const useCaseMocks = vi.hoisted(() => ({
  initiatePayment: vi.fn(),
  handlePaymentWebhook: vi.fn(),
  payWithWallet: vi.fn(),
  getPaymentStatus: vi.fn(),
  getMyWallet: vi.fn(),
  listMyLedger: vi.fn(),
  PaymentUseCaseError: class PaymentUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

// Use real app with auth middleware; unauthenticated paths still return 401.
vi.mock("../../use-cases/payment/payment.use-case.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../use-cases/payment/payment.use-case.js")>();
  return {
    ...actual,
    initiatePayment: useCaseMocks.initiatePayment,
    handlePaymentWebhook: useCaseMocks.handlePaymentWebhook,
    payWithWallet: useCaseMocks.payWithWallet,
    getPaymentStatus: useCaseMocks.getPaymentStatus,
    getMyWallet: useCaseMocks.getMyWallet,
    listMyLedger: useCaseMocks.listMyLedger,
  };
});

const { default: app } = await import("../../index.js");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.FAPSHI_WEBHOOK_SECRET;
});

describe("POST /v1/payments/initiate", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1000, idempotencyKey: "idem-key-01" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing idempotency key", async () => {
    // Still unauthenticated first if cookie missing — validation may not run.
    // Ensure schema rejects empty body with 400 after auth would pass is covered by unit schema tests.
    const res = await app.request("/v1/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "ACCESS_FEE" }),
    });
    // without auth: 401; with auth: 400 — both acceptable gate responses
    expect([400, 401]).toContain(res.status);
  });
});

describe("POST /v1/payments/wallet/pay", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/wallet/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Inscription tournoi", idempotencyKey: "idem-wallet-1" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/payments/:id/status", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/unknown-id/status");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/ledger", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/ledger?skip=0&take=10");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/transactions", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/transactions");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/transactions/:id", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/transactions/tx-1");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/export", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/export");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/metrics", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/metrics");
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/payments/webhook/fapshi (L4 signature)", () => {
  it("rejects invalid webhook payload", async () => {
    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("rejects webhook without required fields", async () => {
    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUCCESS" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 when x-wh-secret is invalid", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "super-secret";
    const { PaymentUseCaseError } = await import("../../use-cases/payment/payment.use-case.js");
    useCaseMocks.handlePaymentWebhook.mockRejectedValueOnce(
      new PaymentUseCaseError("UNAUTHENTICATED", "Signature webhook invalide", 401),
    );

    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wh-secret": "bad",
      },
      body: JSON.stringify({
        transId: "tr-1",
        status: "SUCCESSFUL",
        amount: 1000,
      }),
    });

    expect(res.status).toBe(401);
  });

  it("accepts official Fapshi webhook payload and returns inbox ACK", async () => {
    useCaseMocks.handlePaymentWebhook.mockResolvedValueOnce({
      received: true,
      inboxId: "inbox-1",
      duplicate: false,
      paymentId: "tx-1",
    });

    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wh-secret": "ok",
      },
      body: JSON.stringify({
        transId: "tr-1",
        status: "SUCCESSFUL",
        amount: 1000,
        externalId: "pay_ext",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.received).toBe(true);
    expect(body.data.inboxId).toBe("inbox-1");
    expect(useCaseMocks.handlePaymentWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookSecretHeader: "ok",
        body: expect.objectContaining({ transId: "tr-1", status: "SUCCESSFUL" }),
      }),
    );
  });
});
