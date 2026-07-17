/**
 * L3 integration: real PostgreSQL.
 * Frontiers: Prisma → PostgreSQL (no mocks).
 * Requires TEST_DATABASE_URL or DATABASE_URL after migrate deploy.
 */
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  announcementRepository,
  notificationRepository,
  paymentRepository,
  partyRepository,
  participationRepository,
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

describe.skipIf(!runL3)("L3 repositories / constraints / transactions / claim", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-repo-", partyCodePrefix: "L3REPO-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-repo-", partyCodePrefix: "L3REPO-" });
    await disconnectTestPrisma();
  });

  async function createGraph() {
    const userA = await userRepository.createUser({
      email: `l3-repo-a-${suffix}@example.test`,
      name: "L3 A",
    });
    const userB = await userRepository.createUser({
      email: `l3-repo-b-${suffix}@example.test`,
      name: "L3 B",
    });
    const party = await partyRepository.createParty({
      code: `L3REPO-PARTY-${suffix}`,
      name: "L3 Party",
    });
    await partyRepository.updatePartyStatus(party.id, "SCHEDULED");
    const partA = await participationRepository.createParticipation({
      partyId: party.id,
      userId: userA.id,
      status: "REGISTERED",
      idempotencyKey: `l3-repo-part-a-${suffix}`,
    });
    const partB = await participationRepository.createParticipation({
      partyId: party.id,
      userId: userB.id,
      status: "REGISTERED",
      idempotencyKey: `l3-repo-part-b-${suffix}`,
    });
    const round = await roundRepository.createRound({
      partyId: party.id,
      number: 1,
      minigame: "memory_sequence",
      status: "ACTIVE",
    });
    return { userA, userB, party, partA, partB, round };
  }

  it("enforces unique email and unique party participation", async () => {
    const { userA, party } = await createGraph();

    await expect(
      userRepository.createUser({ email: userA.email, name: "dup" }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    await expect(
      participationRepository.createParticipation({
        partyId: party.id,
        userId: userA.id,
        status: "REGISTERED",
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("enforces unique payment idempotency keys", async () => {
    const { userA } = await createGraph();
    const wallet = await paymentRepository.createWallet({ userId: userA.id });
    await paymentRepository.createPaymentTransaction({
      walletId: wallet.id,
      amount: 10,
      type: "ACCESS_FEE",
      idempotencyKey: `l3-repo-pay-${suffix}`,
      status: "PENDING",
    });

    await expect(
      paymentRepository.createPaymentTransaction({
        walletId: wallet.id,
        amount: 10,
        type: "ACCESS_FEE",
        idempotencyKey: `l3-repo-pay-${suffix}`,
        status: "PENDING",
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("debits wallet idempotently under createWalletDebitPayment", async () => {
    const { userA } = await createGraph();
    const wallet = await paymentRepository.createWallet({ userId: userA.id });
    await paymentRepository.updateWalletBalance(wallet.id, 500);

    const first = await paymentRepository.createWalletDebitPayment({
      walletId: wallet.id,
      amount: 100,
      reason: "L3 access fee",
      idempotencyKey: `l3-repo-debit-${suffix}`,
    });
    const second = await paymentRepository.createWalletDebitPayment({
      walletId: wallet.id,
      amount: 100,
      reason: "L3 access fee",
      idempotencyKey: `l3-repo-debit-${suffix}`,
    });

    expect(second.transaction.id).toBe(first.transaction.id);
    const after = await paymentRepository.findWalletById(wallet.id);
    expect(Number(after?.balance)).toBe(400);
  });

  it("claims a due round deadline at most once under concurrent callers", async () => {
    const { round } = await createGraph();
    const past = new Date(Date.now() - 60_000);
    await roundRepository.createOrUpdateRoundDeadline({
      roundId: round.id,
      deadlineAt: past,
      durationMs: 60_000,
      closedAt: null,
    });

    const [a, b] = await Promise.all([
      roundRepository.claimDueRoundDeadline(round.id, new Date()),
      roundRepository.claimDueRoundDeadline(round.id, new Date()),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    const deadline = await roundRepository.findRoundDeadlineByRoundId(round.id);
    expect(deadline?.closedAt).not.toBeNull();
  });

  it("persists ScoreReview without involving Announcement", async () => {
    const { userA, partA, round } = await createGraph();
    const provisional = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: partA.id,
      score: 12,
      status: "PENDING",
    });

    const { review, provisional: updated } =
      await scoreRepository.createScoreReviewAndUpdateProvisional({
        provisionalScoreId: provisional.id,
        reviewedBy: userA.id,
        action: "CORRECT",
        reason: "L3 correction",
        previousScore: 12,
        newScore: 15,
        provisionalStatus: "VERIFIED",
      });

    expect(review.action).toBe("CORRECT");
    expect(Number(review.newScore)).toBe(15);
    expect(updated.status).toBe("VERIFIED");
    expect(Number(updated.score)).toBe(15);

    const listed = await scoreRepository.listScoreReviewsByProvisional(provisional.id);
    expect(listed).toHaveLength(1);
  });

  it("persists DeliveryLog under NotificationJob without creating Announcement", async () => {
    const { userA, party } = await createGraph();

    const job = await notificationRepository.createNotificationJob({
      userId: userA.id,
      type: "L3_TEST",
      payload: { partyId: party.id },
      status: "PENDING",
    });

    const log = await notificationRepository.createDeliveryLog({
      jobId: job.id,
      channel: "in_app",
      status: "SENT",
    });

    const logs = await notificationRepository.listDeliveryLogsByJob(job.id);
    expect(logs.map((l) => l.id)).toContain(log.id);

    // Announcement remains a separate repository surface.
    const announcement = await announcementRepository.createAnnouncement({
      partyId: party.id,
      title: `L3 ann ${suffix}`,
      body: "separate from delivery",
      createdBy: userA.id,
    });
    expect(announcement.id).toBeTruthy();
    expect(announcement.title).toContain("L3 ann");
  });

  it("smokes party → participation → round → provisional → published path", async () => {
    const { userA, partA, round } = await createGraph();
    const provisional = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: partA.id,
      score: 7,
      status: "PENDING",
    });
    const published = await scoreRepository.publishScore(
      provisional.id,
      round.id,
      partA.id,
      7,
      userA.id,
      1,
    );
    expect(published.provisionalScoreId).toBe(provisional.id);
    expect(published.rank).toBe(1);
    const listed = await scoreRepository.listPublishedScoresByRound(round.id);
    expect(listed).toHaveLength(1);
  });

  it("L3 concurrent correction: version conflict is deterministic", async () => {
    const { userA, userB, partA, round } = await createGraph();
    const provisional = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: partA.id,
      score: 20,
      status: "PROVISIONAL",
    });

    const first = await scoreRepository.createScoreReviewAndUpdateProvisional({
      provisionalScoreId: provisional.id,
      reviewedBy: userA.id,
      action: "CORRECT",
      reason: "Admin A correction",
      previousScore: 20,
      newScore: 21,
      provisionalStatus: "VERIFIED",
      expectedUpdatedAt: provisional.updatedAt,
    });
    expect(Number(first.provisional.score)).toBe(21);

    await expect(
      scoreRepository.createScoreReviewAndUpdateProvisional({
        provisionalScoreId: provisional.id,
        reviewedBy: userB.id,
        action: "CORRECT",
        reason: "Admin B stale correction",
        previousScore: 20,
        newScore: 22,
        provisionalStatus: "VERIFIED",
        expectedUpdatedAt: provisional.updatedAt,
      }),
    ).rejects.toThrow("PROVISIONAL_SCORE_VERSION_CONFLICT");

    const current = await scoreRepository.findProvisionalScore(provisional.id);
    expect(Number(current?.score)).toBe(21);
  });

  it("L3 concurrent publication: second admin gets idempotent published projection", async () => {
    const { userA, userB, partA, partB, round } = await createGraph();
    const provA = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: partA.id,
      score: 30,
      status: "VERIFIED",
    });
    const provB = await scoreRepository.createProvisionalScore({
      roundId: round.id,
      participationId: partB.id,
      score: 10,
      status: "VERIFIED",
    });

    const rows = [
      {
        provisionalScoreId: provA.id,
        participationId: partA.id,
        score: 30,
        rank: 1,
      },
      {
        provisionalScoreId: provB.id,
        participationId: partB.id,
        score: 10,
        rank: 2,
      },
    ];

    const [r1, r2] = await Promise.all([
      scoreRepository.publishRoundScores({
        roundId: round.id,
        publishedBy: userA.id,
        rows,
      }),
      scoreRepository.publishRoundScores({
        roundId: round.id,
        publishedBy: userB.id,
        rows,
      }),
    ]);

    const winners = [r1, r2].filter((r) => !r.alreadyPublished);
    const idempotent = [r1, r2].filter((r) => r.alreadyPublished);
    expect(winners.length + idempotent.length).toBe(2);
    expect(winners.length).toBeLessThanOrEqual(1);

    const listed = await scoreRepository.listPublishedScoresByRound(round.id);
    expect(listed).toHaveLength(2);
    expect(new Set(listed.map((p) => p.provisionalScoreId)).size).toBe(2);
    // Deterministic ranks frozen in projection
    expect(listed.map((p) => p.rank).sort()).toEqual([1, 2]);
  });
});
