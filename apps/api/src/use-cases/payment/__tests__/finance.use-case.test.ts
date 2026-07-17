import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    findTransactionById: vi.fn(),
    findTransactionByIdempotencyKey: vi.fn(),
    findOpenReconciliationForPayment: vi.fn(),
    createReconciliation: vi.fn(),
    findReconciliationById: vi.fn(),
    updateReconciliation: vi.fn(),
    updateTransactionStatus: vi.fn(),
    createPayoutTransfer: vi.fn(),
    createPaymentTransaction: vi.fn(),
    findLedgerEntryByTransactionId: vi.fn(),
    createCompensationLedgerEntry: vi.fn(),
    listAllTransactions: vi.fn(),
    countTransactions: vi.fn(),
    listReconciliations: vi.fn(),
    sumLedgerCredits: vi.fn(),
    sumLedgerDebits: vi.fn(),
    sumWalletBalances: vi.fn(),
    countPaidParticipations: vi.fn(),
    listWallets: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn().mockResolvedValue({}),
  },
}));

const fapshiMocks = vi.hoisted(() => ({
  expireCollectionPayment: vi.fn(),
  executePayout: vi.fn(),
  getCollectionPaymentStatus: vi.fn(),
  wireStatusToEnum: (s: string) => (s === "UNKNOWN" ? "UNSPECIFIED" : s),
}));

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("@session-jeu/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@session-jeu/shared")>();
  return {
    ...actual,
    ...fapshiMocks,
  };
});

const {
  requestCompensation,
  decideCompensation,
  financePayoutCommand,
  expirePaymentCommand,
} = await import("../finance.use-case.js");

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FINANCE_STEP_UP_TOKEN = "step-secret";
  delete process.env.APP_ENV;
  delete process.env.NODE_ENV;
  dbMocks.paymentRepository.listAllTransactions.mockResolvedValue([]);
});

describe("finance.use-case maker-checker", () => {
  it("requestCompensation opens PENDING recon without moving money", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValue({
      id: "pay-1",
      status: "SUCCESSFUL",
      amount: 1000,
      currency: "XAF",
    });
    dbMocks.paymentRepository.findOpenReconciliationForPayment.mockResolvedValue(null);
    dbMocks.paymentRepository.createReconciliation.mockResolvedValue({ id: "rec-1" });

    const result = await requestCompensation({
      paymentId: "pay-1",
      actorUserId: "finance-a",
      stepUpToken: "step-secret",
      reason: "double charge",
      beneficiaryVerified: true,
      beneficiaryPhone: "670000000",
      idempotencyKey: "idem-comp-1",
    });

    expect(result).toEqual({ reconciliationId: "rec-1", decision: "PENDING" });
    expect(fapshiMocks.executePayout).not.toHaveBeenCalled();
  });

  it("decideCompensation rejects same actor (maker-checker)", async () => {
    dbMocks.paymentRepository.findReconciliationById.mockResolvedValue({
      id: "rec-1",
      notes: JSON.stringify({
        kind: "COMPENSATION_REQUEST",
        decision: "PENDING",
        paymentId: "pay-1",
        amount: 1000,
        currency: "XAF",
        reason: "x",
        requestedBy: "finance-a",
        requestedAt: new Date().toISOString(),
        beneficiaryVerified: true,
        beneficiaryPhone: "670000000",
      }),
    });

    await expect(
      decideCompensation({
        reconciliationId: "rec-1",
        actorUserId: "finance-a",
        stepUpToken: "step-secret",
        decision: "APPROVED_MANUAL",
        reason: "ok",
        idempotencyKey: "idem-dec-1",
      }),
    ).rejects.toMatchObject({ code: "FAILED_PRECONDITION" });
  });

  it("financePayoutCommand refuses provisional gains (scoresPublished=false)", async () => {
    await expect(
      financePayoutCommand({
        userId: "player-1",
        amount: 500,
        actorUserId: "finance-b",
        stepUpToken: "step-secret",
        reason: "prize",
        beneficiaryVerified: true,
        beneficiaryPhone: "670000000",
        scoresPublished: false,
        idempotencyKey: "idem-payout-1",
      }),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it("expire requires step-up", async () => {
    await expect(
      expirePaymentCommand({
        paymentId: "pay-1",
        actorUserId: "finance-a",
        reason: "timeout",
        idempotencyKey: "idem-exp-1",
      }),
    ).rejects.toMatchObject({ code: "FAILED_PRECONDITION" });
  });
});
