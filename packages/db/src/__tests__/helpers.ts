import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | null = null;

/**
 * Prefer TEST_DATABASE_URL (integration harness) over DATABASE_URL.
 */
export function getIntegrationDatabaseUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || undefined;
}

export function isIntegrationEnv(): boolean {
  return !!getIntegrationDatabaseUrl();
}

export function requireIntegrationEnv(): string {
  const url = getIntegrationDatabaseUrl();
  if (!url) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for L3 tests");
  }
  return url;
}

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const url = getIntegrationDatabaseUrl();
    testPrisma = new PrismaClient(
      url
        ? {
            datasources: { db: { url } },
          }
        : undefined,
    );
  }
  return testPrisma;
}

export async function disconnectTestPrisma(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Delete L3 fixture rows created with the given email/code prefixes.
 * Order respects FK constraints present in the schema.
 */
export async function cleanupL3Fixtures(options: {
  emailPrefix?: string;
  partyCodePrefix?: string;
}): Promise<void> {
  const prisma = getTestPrisma();
  const emailPrefix = options.emailPrefix ?? "l3-";
  const partyCodePrefix = options.partyCodePrefix ?? "L3-";

  const users = await prisma.user.findMany({
    where: { email: { startsWith: emailPrefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const parties = await prisma.party.findMany({
    where: { code: { startsWith: partyCodePrefix } },
    select: { id: true },
  });
  const partyIds = parties.map((p) => p.id);

  const participations = await prisma.partyParticipation.findMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { partyId: { in: partyIds } },
      ],
    },
    select: { id: true },
  });
  const participationIds = participations.map((p) => p.id);

  const rounds = await prisma.round.findMany({
    where: { partyId: { in: partyIds } },
    select: { id: true },
  });
  const roundIds = rounds.map((r) => r.id);

  const provisional = await prisma.provisionalScore.findMany({
    where: {
      OR: [{ roundId: { in: roundIds } }, { participationId: { in: participationIds } }],
    },
    select: { id: true },
  });
  const provisionalIds = provisional.map((p) => p.id);

  const jobs = await prisma.notificationJob.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const jobIds = jobs.map((j) => j.id);

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  const transactions = await prisma.paymentTransaction.findMany({
    where: { walletId: { in: walletIds } },
    select: { id: true },
  });
  const transactionIds = transactions.map((t) => t.id);

  await prisma.deliveryLog.deleteMany({ where: { jobId: { in: jobIds } } });
  await prisma.notificationJob.deleteMany({ where: { id: { in: jobIds } } });
  await prisma.scoreReview.deleteMany({ where: { provisionalScoreId: { in: provisionalIds } } });
  await prisma.publishedScore.deleteMany({
    where: {
      OR: [{ provisionalScoreId: { in: provisionalIds } }, { roundId: { in: roundIds } }],
    },
  });
  await prisma.provisionalScore.deleteMany({ where: { id: { in: provisionalIds } } });
  await prisma.playerAction.deleteMany({
    where: {
      OR: [{ roundId: { in: roundIds } }, { participationId: { in: participationIds } }],
    },
  });
  await prisma.roundDeadline.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.roundParticipant.deleteMany({
    where: {
      OR: [{ roundId: { in: roundIds } }, { participationId: { in: participationIds } }],
    },
  });
  await prisma.round.deleteMany({ where: { id: { in: roundIds } } });
  await prisma.realtimeConnection.deleteMany({
    where: { participationId: { in: participationIds } },
  });
  await prisma.announcement.deleteMany({
    where: {
      OR: [{ partyId: { in: partyIds } }, { createdBy: { in: userIds } }],
    },
  });
  await prisma.partyParticipation.deleteMany({ where: { id: { in: participationIds } } });
  await prisma.party.deleteMany({ where: { id: { in: partyIds } } });
  await prisma.ledgerEntry.deleteMany({ where: { transactionId: { in: transactionIds } } });
  await prisma.paymentTransaction.deleteMany({ where: { id: { in: transactionIds } } });
  await prisma.wallet.deleteMany({ where: { id: { in: walletIds } } });
  await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.roleAssignment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
