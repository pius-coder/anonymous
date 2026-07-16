/**
 * L3: webhook settle idempotence + concurrent wallet debit on real PostgreSQL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { paymentRepository, userRepository } from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 payment webhook / wallet concurrency", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-pay-", partyCodePrefix: "L3PAY-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-pay-", partyCodePrefix: "L3PAY-" });
    await disconnectTestPrisma();
  });

  it("does not double-credit wallet on webhook replay", async () => {
    const user = await userRepository.createUser({
      email: `l3-pay-u-${suffix}@example.test`,
      name: "L3 Pay",
    });
    const wallet = await paymentRepository.createWallet({ userId: user.id });
    await paymentRepository.updateWalletBalance(wallet.id, 0);

    const tx = await paymentRepository.createPaymentTransaction({
      walletId: wallet.id,
      amount: 400,
      type: "TOP_UP",
      provider: "FAPSHI",
      idempotencyKey: `l3-wh-${suffix}`,
      status: "PENDING",
    });

    const first = await paymentRepository.settlePaymentWebhook({
      transactionId: tx.id,
      status: "SUCCESSFUL",
      providerReference: `prv-${suffix}`,
    });
    const second = await paymentRepository.settlePaymentWebhook({
      transactionId: tx.id,
      status: "SUCCESSFUL",
      providerReference: `prv-${suffix}`,
    });

    expect(first?.status).toBe("SUCCESSFUL");
    expect(second?.status).toBe("SUCCESSFUL");

    const after = await paymentRepository.findWalletById(wallet.id);
    expect(Number(after?.balance)).toBe(400);

    const ledger = await paymentRepository.findLedgerEntryByTransactionId(tx.id);
    expect(ledger).not.toBeNull();
    expect(Number(ledger?.credit)).toBe(400);
  });

  it("debits wallet once under concurrent createWalletDebitPayment", async () => {
    const user = await userRepository.createUser({
      email: `l3-pay-d-${suffix}@example.test`,
      name: "L3 Debit",
    });
    const wallet = await paymentRepository.createWallet({ userId: user.id });
    await paymentRepository.updateWalletBalance(wallet.id, 1000);

    const key = `l3-debit-conc-${suffix}`;
    const input = {
      walletId: wallet.id,
      amount: 300,
      reason: "concurrent access",
      idempotencyKey: key,
    };

    // Serializable isolation may abort one concurrent writer; retry the loser once.
    const settled = await Promise.allSettled([
      paymentRepository.createWalletDebitPayment(input),
      paymentRepository.createWalletDebitPayment(input),
    ]);

    const successes = settled.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof paymentRepository.createWalletDebitPayment>>> =>
        r.status === "fulfilled",
    );
    expect(successes.length).toBeGreaterThanOrEqual(1);

    if (successes.length < 2) {
      const retry = await paymentRepository.createWalletDebitPayment(input);
      successes.push({ status: "fulfilled", value: retry });
    }

    expect(successes[0]!.value.transaction.id).toBe(successes[1]!.value.transaction.id);
    const after = await paymentRepository.findWalletById(wallet.id);
    expect(Number(after?.balance)).toBe(700);
  });
});
