/**
 * L3: score publication + gains + audit are atomic / idempotent.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  partyRepository,
  participationRepository,
  paymentRepository,
  roundRepository,
  scoreRepository,
  userRepository,
} from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 score publish + gains atomic", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-sc-", partyCodePrefix: "L3-SC-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-sc-", partyCodePrefix: "L3-SC-" });
    await disconnectTestPrisma();
  });

  it("publish with gains and audit is idempotent under concurrency", async () => {
    const admin = await userRepository.createUser({
      email: `l3-sc-admin-${suffix}@example.test`,
      name: "Admin",
    });
    const player = await userRepository.createUser({
      email: `l3-sc-p-${suffix}@example.test`,
      name: "Player",
    });
    const party = await partyRepository.createParty({
      code: `L3-SC-${suffix}`,
      name: "Score party",
      maxPlayers: 4,
    });
    const part = await participationRepository.createParticipation({
      partyId: party.id,
      userId: player.id,
      status: "REGISTERED",
      idempotencyKey: `l3-sc-part-${suffix}`,
    });
    const wallet = await paymentRepository.createWallet({ userId: player.id });
    await paymentRepository.updateWalletBalance(wallet.id, 0);

    const round = await roundRepository.createRound({
      partyId: party.id,
      number: 1,
      minigame: "memory_sequence",
      status: "WAITING_REVIEW",
    });
    const provisional = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: part.id,
      score: 42,
      status: "VERIFIED",
      evidenceHash: `hash-${suffix}`,
    });

    const rows = [
      {
        provisionalScoreId: provisional.id,
        participationId: part.id,
        score: 42,
        rank: 1,
        prizeAmount: 250,
        walletId: wallet.id,
        userId: player.id,
      },
    ];

    const [a, b] = await Promise.all([
      scoreRepository.publishRoundScoresWithGainsAndAudit({
        roundId: round.id,
        publishedBy: admin.id,
        rows,
        correlationId: `corr-${suffix}`,
      }),
      scoreRepository.publishRoundScoresWithGainsAndAudit({
        roundId: round.id,
        publishedBy: admin.id,
        rows,
        correlationId: `corr-${suffix}`,
      }),
    ]);

    const winners = [a, b].filter((r) => !r.alreadyPublished);
    const idempotent = [a, b].filter((r) => r.alreadyPublished);
    expect(winners.length + idempotent.length).toBe(2);
    expect(winners.length).toBeLessThanOrEqual(1);

    const published = await scoreRepository.listPublishedScoresByRound(round.id);
    expect(published).toHaveLength(1);

    const prizeTx = await paymentRepository.findTransactionByIdempotencyKey(
      `prize:${round.id}:${part.id}`,
    );
    expect(prizeTx).not.toBeNull();

    const refreshed = await paymentRepository.findWalletById(wallet.id);
    expect(Number(refreshed?.balance)).toBe(250);

    const audits = await prisma.auditLog.findMany({
      where: { entity: "Round", entityId: round.id, action: "SCORES_PUBLISHED" },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });
});
