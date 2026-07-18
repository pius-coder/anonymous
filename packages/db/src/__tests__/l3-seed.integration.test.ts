/**
 * L3: deterministic seed against real PostgreSQL.
 * Proves first apply + second re-run (upsert) behavior.
 */
import { afterAll, describe, expect, it } from "vitest";
import { runSeed, SEED } from "../seed.js";
import { disconnectTestPrisma, getTestPrisma, isIntegrationEnv } from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 deterministic seed", () => {
  const prisma = getTestPrisma();

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it("applies seed twice with stable graph and no duplicate wallets/participations", async () => {
    const first = await runSeed(prisma);
    const second = await runSeed(prisma);

    expect(second.users.adminId).toBe(first.users.adminId);
    expect(second.partyId).toBe(first.partyId);
    expect(second.roundId).toBe(first.roundId);
    expect(second.reRun).toBe(true);

    const emails = [
      SEED.admin.email,
      SEED.support.email,
      SEED.finance.email,
      SEED.player1.email,
      SEED.player2.email,
    ];
    const users = await prisma.user.findMany({ where: { email: { in: [...emails] } } });
    expect(users).toHaveLength(5);

    const roles = await prisma.roleAssignment.findMany({
      where: { user: { email: { in: [...emails] } } },
    });
    const roleSet = new Set(roles.map((r) => r.role));
    expect(roleSet.has("ADMIN")).toBe(true);
    expect(roleSet.has("SUPPORT")).toBe(true);
    expect(roleSet.has("FINANCE")).toBe(true);
    expect(roleSet.has("PLAYER")).toBe(true);

    const party = await prisma.party.findUnique({ where: { code: SEED.partyCode } });
    expect(party?.status).toBe("SCHEDULED");
    expect(party?.visibility).toBe("public");

    const participations = await prisma.partyParticipation.findMany({
      where: { partyId: party!.id },
    });
    expect(participations).toHaveLength(2);

    const wallets = await prisma.wallet.findMany({
      where: {
        user: {
          email: { in: [SEED.player1.email, SEED.player2.email] },
        },
      },
    });
    expect(wallets).toHaveLength(2);

    const credits = await prisma.paymentTransaction.findMany({
      where: {
        idempotencyKey: { in: [SEED.paymentIdempotencyP1, SEED.paymentIdempotencyP2] },
      },
    });
    expect(credits).toHaveLength(2);

    const reviews = await prisma.scoreReview.count({
      where: { provisionalScore: { roundId: first.roundId } },
    });
    expect(reviews).toBeGreaterThanOrEqual(1);

    const deliveries = await prisma.deliveryLog.count({
      where: {
        notificationJob: { type: "SEED_LOBBY_REMINDER" },
      },
    });
    expect(deliveries).toBeGreaterThanOrEqual(1);

    const announcements = await prisma.announcement.count({
      where: { partyId: party!.id, title: "Seed lobby announcement" },
    });
    expect(announcements).toBe(1);

    const connection = await prisma.realtimeConnection.findUnique({
      where: { tokenHash: SEED.player1TokenHash },
    });
    expect(connection).not.toBeNull();
  });
});
