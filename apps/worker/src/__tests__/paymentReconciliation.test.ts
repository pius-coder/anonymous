import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMetrics } from "../metrics.js";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    listAllTransactions: vi.fn(),
    findTransactionById: vi.fn(),
    updateTransactionStatus: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const { reconcilePendingTransactions } = await import("../jobs/paymentReconciliation.js");

beforeEach(() => {
  vi.clearAllMocks();
  resetMetrics();
});

describe("reconcilePendingTransactions", () => {
  it("expires only still-PENDING stale transactions (idempotent re-fetch)", async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    dbMocks.paymentRepository.listAllTransactions.mockResolvedValue([
      { id: "tx-1", status: "PENDING", createdAt: old, reference: "r1" },
      { id: "tx-2", status: "PENDING", createdAt: old, reference: "r2" },
    ]);
    dbMocks.paymentRepository.findTransactionById
      .mockResolvedValueOnce({
        id: "tx-1",
        status: "PENDING",
        createdAt: old,
        reference: "r1",
      })
      .mockResolvedValueOnce({
        id: "tx-2",
        status: "EXPIRED",
        createdAt: old,
        reference: "r2_EXPIRED",
      });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValue({});

    const result = await reconcilePendingTransactions();

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(dbMocks.paymentRepository.updateTransactionStatus).toHaveBeenCalledTimes(1);
    expect(dbMocks.paymentRepository.updateTransactionStatus).toHaveBeenCalledWith("tx-1", {
      status: "EXPIRED",
      reference: "r1_EXPIRED",
    });
  });

  it("never starts a party (only payment status updates)", async () => {
    dbMocks.paymentRepository.listAllTransactions.mockResolvedValue([]);
    const result = await reconcilePendingTransactions();
    expect(result).toMatchObject({ processed: 0, failed: 0 });
    expect(Object.keys(dbMocks.paymentRepository)).toEqual([
      "listAllTransactions",
      "findTransactionById",
      "updateTransactionStatus",
    ]);
  });
});
