import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMetrics } from "../metrics.js";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    expireDueCheckouts: vi.fn(),
    listPendingForReconciliation: vi.fn(),
    findTransactionById: vi.fn(),
    updateTransactionStatus: vi.fn(),
    createReconciliation: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("@session-jeu/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@session-jeu/shared")>();
  return {
    ...actual,
    expireCollectionPayment: vi.fn(),
    getCollectionPaymentStatus: vi.fn(),
    wireStatusToEnum: (s: string) => (s === "UNKNOWN" ? "UNSPECIFIED" : s),
  };
});

const { reconcilePendingTransactions } = await import("../jobs/paymentReconciliation.js");

beforeEach(() => {
  vi.clearAllMocks();
  resetMetrics();
  dbMocks.paymentRepository.expireDueCheckouts.mockResolvedValue(0);
  dbMocks.paymentRepository.createReconciliation.mockResolvedValue({});
});

describe("reconcilePendingTransactions", () => {
  it("expires only still-PENDING stale transactions (idempotent re-fetch)", async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    dbMocks.paymentRepository.listPendingForReconciliation.mockResolvedValue([
      { id: "tx-1", status: "PENDING", createdAt: old, reference: "r1" },
      { id: "tx-2", status: "PENDING", createdAt: old, reference: "r2" },
    ]);
    dbMocks.paymentRepository.findTransactionById
      .mockResolvedValueOnce({
        id: "tx-1",
        status: "PENDING",
        createdAt: old,
        reference: "r1",
        providerTransId: null,
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        id: "tx-2",
        status: "EXPIRED",
        createdAt: old,
        reference: "r2_EXPIRED",
        providerTransId: null,
        expiresAt: null,
      });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValue({});

    const result = await reconcilePendingTransactions();

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(dbMocks.paymentRepository.updateTransactionStatus).toHaveBeenCalledTimes(1);
    expect(dbMocks.paymentRepository.updateTransactionStatus).toHaveBeenCalledWith("tx-1", {
      status: "EXPIRED",
      internalStatus: "EXPIRED",
      wireStatus: "EXPIRED",
      reference: "r1_EXPIRED",
    });
  });

  it("never starts a party (only payment status updates)", async () => {
    dbMocks.paymentRepository.listPendingForReconciliation.mockResolvedValue([]);
    const result = await reconcilePendingTransactions();
    expect(result).toMatchObject({ processed: 0, failed: 0 });
    expect(dbMocks.paymentRepository.listPendingForReconciliation).toHaveBeenCalled();
    expect(dbMocks.paymentRepository.expireDueCheckouts).toHaveBeenCalled();
  });

  it("records mismatch and DLQ when provider status poll fails", async () => {
    const { getCollectionPaymentStatus } = await import("@session-jeu/shared");
    const recent = new Date();
    dbMocks.paymentRepository.listPendingForReconciliation.mockResolvedValue([
      { id: "tx-p", status: "PENDING", createdAt: recent },
    ]);
    dbMocks.paymentRepository.findTransactionById.mockResolvedValue({
      id: "tx-p",
      status: "PENDING",
      createdAt: recent,
      providerTransId: "real-trans",
      amount: 1000,
      expiresAt: null,
      reference: "ref",
    });
    vi.mocked(getCollectionPaymentStatus).mockRejectedValue(new Error("network"));

    const result = await reconcilePendingTransactions();
    expect(result.failed).toBe(1);
    expect(result.dlq).toContain("tx-p");
    expect(dbMocks.paymentRepository.createReconciliation).toHaveBeenCalled();
  });
});
