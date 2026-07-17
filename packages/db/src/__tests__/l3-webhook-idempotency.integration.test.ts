/**
 * L3: webhook inbox + settlement never double-apply payment.
 */
import { FapshiWireStatus, PaymentStatus, ProviderServiceKind } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  partyRepository,
  participationRepository,
  paymentRepository,
  userRepository,
} from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 webhook / reconciliation idempotency", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-wh-", partyCodePrefix: "L3-WH-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-wh-", partyCodePrefix: "L3-WH-" });
    await disconnectTestPrisma();
  });

  it("duplicate webhook externalEventId does not double-settle", async () => {
    const user = await userRepository.createUser({
      email: `l3-wh-u-${suffix}@example.test`,
      name: "Wh",
    });
    const party = await partyRepository.createParty({
      code: `L3-WH-${suffix}`,
      name: "WH party",
      maxPlayers: 4,
      entryFeeAmount: 500,
    });
    const part = await participationRepository.createParticipation({
      partyId: party.id,
      userId: user.id,
      status: "REGISTERED",
      idempotencyKey: `l3-wh-p-${suffix}`,
    });
    const wallet = await paymentRepository.createWallet({ userId: user.id });

    const payment = await paymentRepository.createCheckoutPayment({
      amount: 500,
      userId: user.id,
      partyId: party.id,
      participationId: part.id,
      walletId: wallet.id,
      providerExternalId: `ext-${suffix}`,
      idempotencyKey: `checkout-${suffix}`,
      checkoutUrl: "https://example.test/checkout",
      expiresAt: new Date(Date.now() + 900_000),
    });

    const eventId = `evt-${suffix}`;
    const first = await paymentRepository.ingestProviderWebhook({
      provider: "fapshi",
      externalEventId: eventId,
      providerTransId: `trans-${suffix}`,
      wireStatus: FapshiWireStatus.SUCCESSFUL,
      paymentId: payment.id,
      redactedSummary: "status=SUCCESSFUL",
      serviceKind: ProviderServiceKind.COLLECTION,
    });
    expect(first.duplicate).toBe(false);

    const second = await paymentRepository.ingestProviderWebhook({
      provider: "fapshi",
      externalEventId: eventId,
      providerTransId: `trans-${suffix}`,
      wireStatus: FapshiWireStatus.SUCCESSFUL,
      paymentId: payment.id,
      redactedSummary: "status=SUCCESSFUL",
    });
    expect(second.duplicate).toBe(true);
    expect(second.inbox.id).toBe(first.inbox.id);

    const apply1 = await paymentRepository.applyWebhookSettlement({
      inboxId: first.inbox.id,
      transactionId: payment.id,
      wireStatus: FapshiWireStatus.SUCCESSFUL,
      providerTransId: `trans-${suffix}`,
      admitOnSuccess: true,
    });
    expect(apply1.applied).toBe(true);
    expect(apply1.payment.status).toBe(PaymentStatus.SUCCESSFUL);

    const apply2 = await paymentRepository.applyWebhookSettlement({
      inboxId: first.inbox.id,
      transactionId: payment.id,
      wireStatus: FapshiWireStatus.SUCCESSFUL,
      providerTransId: `trans-${suffix}`,
      admitOnSuccess: true,
    });
    expect(apply2.applied).toBe(false);

    const inboxCount = await prisma.providerWebhookInbox.count({
      where: { provider: "fapshi", externalEventId: eventId },
    });
    expect(inboxCount).toBe(1);

    const updatedPart = await participationRepository.findParticipationById(part.id);
    expect(updatedPart?.paymentState).toBe("PAID");
    expect(updatedPart?.admissionState).toBe("ADMITTED");
  });

  it("collection and payout credential refs are distinct", async () => {
    const collection = await paymentRepository.upsertProviderCredentialRef({
      serviceKind: ProviderServiceKind.COLLECTION,
      name: `col-${suffix}`,
      envKeyName: "FAPSHI_COLLECTION_API_KEY",
    });
    const payout = await paymentRepository.upsertProviderCredentialRef({
      serviceKind: ProviderServiceKind.PAYOUT,
      name: `pay-${suffix}`,
      envKeyName: "FAPSHI_PAYOUT_API_KEY",
    });
    expect(collection.serviceKind).toBe(ProviderServiceKind.COLLECTION);
    expect(payout.serviceKind).toBe(ProviderServiceKind.PAYOUT);
    expect(collection.envKeyName).not.toBe(payout.envKeyName);
  });
});
