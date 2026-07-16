import { beforeEach, describe, expect, it, vi } from "vitest";
import { Code, ConnectError } from "@connectrpc/connect";
import { PaymentV1 } from "@session-jeu/contracts";

const useCaseMocks = vi.hoisted(() => ({
  getMyWallet: vi.fn(),
  initiatePayment: vi.fn(),
  initiateTransfer: vi.fn(),
  listMyLedger: vi.fn(),
  listMyPayments: vi.fn(),
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

const authMocks = vi.hoisted(() => ({
  requireRpcUser: vi.fn(),
  requireRpcRole: vi.fn(),
  connectCodeFromHttpStatus: (status: number) => {
    if (status === 401) return Code.Unauthenticated;
    if (status === 403) return Code.PermissionDenied;
    if (status === 404) return Code.NotFound;
    if (status === 400) return Code.InvalidArgument;
    return Code.Internal;
  },
}));

vi.mock("../../use-cases/payment/payment.use-case.js", () => useCaseMocks);
vi.mock("../auth-context.js", () => authMocks);

const { paymentService } = await import("../payment-service.js");

const context = {
  requestHeader: new Headers(),
  responseHeader: new Headers(),
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireRpcUser.mockResolvedValue({
    id: "user-1",
    email: "p@test.local",
    roles: ["PLAYER"],
  });
});

describe("paymentService Connect transport (L4)", () => {
  it("processPayment uses correlation id as idempotency key", async () => {
    useCaseMocks.initiatePayment.mockResolvedValueOnce({
      id: "pay-1",
      checkoutUrl: "/payments/checkout/pay-1",
    });

    const result = await paymentService.processPayment!(
      {
        correlationId: { value: "corr-pay-12345" },
        amount: { currency: "XAF", units: BigInt(500), nanos: 0 },
        provider: "FAPSHI",
      } as never,
      context,
    );

    expect(useCaseMocks.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        purpose: "TOP_UP",
        requestedAmount: 500,
        idempotencyKey: "corr-pay-12345",
      }),
    );
    expect(result).toEqual({ paymentId: "pay-1", checkoutUrl: "/payments/checkout/pay-1" });
  });

  it("initiateTransfer requires finance role", async () => {
    authMocks.requireRpcRole.mockRejectedValueOnce(
      new ConnectError("Permission insuffisante", Code.PermissionDenied),
    );

    await expect(
      paymentService.initiateTransfer!(
        {
          correlationId: { value: "corr-xfer-12345" },
          playerId: { value: "user-2" },
          amount: { currency: "XAF", units: BigInt(100), nanos: 0 },
          destinationReference: "bank-1",
        } as never,
        context,
      ),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });

  it("getWallet returns server balance for current user", async () => {
    useCaseMocks.getMyWallet.mockResolvedValueOnce({
      id: "w1",
      userId: "user-1",
      balance: 1000,
      currency: "XAF",
      createdAt: "2026-07-15T10:00:00.000Z",
    });
    useCaseMocks.listMyLedger.mockResolvedValueOnce([]);

    const result = await paymentService.getWallet!({ playerId: { value: "user-1" } } as never, context);

    expect(result.wallet?.walletId).toBe("w1");
    expect(result.wallet?.balance?.units).toBe(BigInt(1000));
    expect(PaymentV1.PaymentStatus.PENDING).toBeDefined();
  });
});
