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
        { userId: { in: userIds.length ? userIds : ["__none__"] } },
        { partyId: { in: partyIds.length ? partyIds : ["__none__"] } },
      ],
    },
    select: { id: true },
  });
  const participationIds = participations.map((p) => p.id);

  const rounds = await prisma.round.findMany({
    where: { partyId: { in: partyIds.length ? partyIds : ["__none__"] } },
    select: { id: true },
  });
  const roundIds = rounds.map((r) => r.id);

  const provisional = await prisma.provisionalScore.findMany({
    where: {
      OR: [
        { roundId: { in: roundIds.length ? roundIds : ["__none__"] } },
        { participationId: { in: participationIds.length ? participationIds : ["__none__"] } },
      ],
    },
    select: { id: true },
  });
  const provisionalIds = provisional.map((p) => p.id);

  const jobs = await prisma.notificationJob.findMany({
    where: { userId: { in: userIds.length ? userIds : ["__none__"] } },
    select: { id: true },
  });
  const jobIds = jobs.map((j) => j.id);

  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: userIds.length ? userIds : ["__none__"] } },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      OR: [
        { walletId: { in: walletIds.length ? walletIds : ["__none__"] } },
        { userId: { in: userIds.length ? userIds : ["__none__"] } },
        { partyId: { in: partyIds.length ? partyIds : ["__none__"] } },
      ],
    },
    select: { id: true },
  });
  const transactionIds = transactions.map((t) => t.id);

  // Delivery / notifications
  if (jobIds.length) {
    await prisma.deliveryLog.deleteMany({ where: { jobId: { in: jobIds } } });
    await prisma.notificationJob.deleteMany({ where: { id: { in: jobIds } } });
  }
  // Extra safety: any job still pointing at fixture users
  if (userIds.length) {
    const leftoverJobs = await prisma.notificationJob.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    if (leftoverJobs.length) {
      const ids = leftoverJobs.map((j) => j.id);
      await prisma.deliveryLog.deleteMany({ where: { jobId: { in: ids } } });
      await prisma.notificationJob.deleteMany({ where: { id: { in: ids } } });
    }
  }

  // Scoring
  if (provisionalIds.length) {
    await prisma.scoreEvidence.deleteMany({ where: { provisionalScoreId: { in: provisionalIds } } });
    await prisma.scoreReview.deleteMany({ where: { provisionalScoreId: { in: provisionalIds } } });
    await prisma.publishedScore.deleteMany({
      where: { provisionalScoreId: { in: provisionalIds } },
    });
  }
  if (roundIds.length) {
    await prisma.publishedScore.deleteMany({ where: { roundId: { in: roundIds } } });
  }
  if (provisionalIds.length) {
    await prisma.provisionalScore.deleteMany({ where: { id: { in: provisionalIds } } });
  }

  // Game state
  if (roundIds.length) {
    await prisma.roundCheckpoint.deleteMany({ where: { roundId: { in: roundIds } } });
  }
  if (roundIds.length || participationIds.length) {
    await prisma.encryptedSecret.deleteMany({
      where: {
        OR: [
          ...(roundIds.length ? [{ roundId: { in: roundIds } }] : []),
          ...(participationIds.length ? [{ participationId: { in: participationIds } }] : []),
        ],
      },
    });
  }
  if (participationIds.length) {
    await prisma.teamMember.deleteMany({ where: { participationId: { in: participationIds } } });
  }
  if (partyIds.length || roundIds.length) {
    await prisma.teamAssignment.deleteMany({
      where: {
        OR: [
          ...(partyIds.length ? [{ partyId: { in: partyIds } }] : []),
          ...(roundIds.length ? [{ roundId: { in: roundIds } }] : []),
        ],
      },
    });
    await prisma.pairAssignment.deleteMany({
      where: {
        OR: [
          ...(partyIds.length ? [{ partyId: { in: partyIds } }] : []),
          ...(roundIds.length ? [{ roundId: { in: roundIds } }] : []),
        ],
      },
    });
  }
  if (roundIds.length || participationIds.length) {
    await prisma.playerAction.deleteMany({
      where: {
        OR: [
          ...(roundIds.length ? [{ roundId: { in: roundIds } }] : []),
          ...(participationIds.length ? [{ participationId: { in: participationIds } }] : []),
        ],
      },
    });
  }
  if (roundIds.length) {
    await prisma.roundDeadline.deleteMany({ where: { roundId: { in: roundIds } } });
  }
  if (roundIds.length || participationIds.length) {
    await prisma.roundParticipant.deleteMany({
      where: {
        OR: [
          ...(roundIds.length ? [{ roundId: { in: roundIds } }] : []),
          ...(participationIds.length ? [{ participationId: { in: participationIds } }] : []),
        ],
      },
    });
  }
  if (roundIds.length) {
    await prisma.round.deleteMany({ where: { id: { in: roundIds } } });
  }
  if (participationIds.length) {
    await prisma.realtimeConnection.deleteMany({
      where: { participationId: { in: participationIds } },
    });
  }
  if (partyIds.length || userIds.length) {
    await prisma.announcement.deleteMany({
      where: {
        OR: [
          ...(partyIds.length ? [{ partyId: { in: partyIds } }] : []),
          ...(userIds.length ? [{ createdBy: { in: userIds } }] : []),
        ],
      },
    });
  }

  // Payments
  if (participationIds.length) {
    await prisma.partyParticipation.updateMany({
      where: { id: { in: participationIds } },
      data: { paymentTransactionId: null },
    });
  }
  if (transactionIds.length || walletIds.length) {
    await prisma.providerWebhookInbox.deleteMany({
      where: {
        paymentId: { in: transactionIds.length ? transactionIds : ["__none__"] },
      },
    });
    await prisma.paymentReconciliation.deleteMany({
      where: { paymentId: { in: transactionIds.length ? transactionIds : ["__none__"] } },
    });
    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          ...(transactionIds.length ? [{ transactionId: { in: transactionIds } }] : []),
          ...(walletIds.length ? [{ walletId: { in: walletIds } }] : []),
        ],
      },
    });
    await prisma.paymentTransaction.deleteMany({
      where: {
        OR: [
          ...(transactionIds.length ? [{ id: { in: transactionIds } }] : []),
          ...(walletIds.length ? [{ walletId: { in: walletIds } }] : []),
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
        ],
      },
    });
  }

  if (participationIds.length) {
    await prisma.partyParticipation.deleteMany({ where: { id: { in: participationIds } } });
  }
  if (partyIds.length) {
    await prisma.complianceGate.deleteMany({ where: { partyId: { in: partyIds } } });
  }
  if (partyIds.length || userIds.length) {
    await prisma.incident.deleteMany({
      where: {
        OR: [
          ...(partyIds.length ? [{ partyId: { in: partyIds } }] : []),
          ...(userIds.length ? [{ openedById: { in: userIds } }] : []),
        ],
      },
    });
  }
  if (userIds.length) {
    await prisma.supportAccessGrant.deleteMany({ where: { requestedById: { in: userIds } } });
    await prisma.consentRecord.deleteMany({ where: { userId: { in: userIds } } });
  }
  if (partyIds.length) {
    await prisma.party.deleteMany({ where: { id: { in: partyIds } } });
  }
  if (walletIds.length) {
    await prisma.wallet.deleteMany({ where: { id: { in: walletIds } } });
  }
  if (userIds.length) {
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.roleAssignment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.encryptionKey.deleteMany({ where: { createdByUserId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    // Final job sweep
    const finalJobs = await prisma.notificationJob.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    if (finalJobs.length) {
      const ids = finalJobs.map((j) => j.id);
      await prisma.deliveryLog.deleteMany({ where: { jobId: { in: ids } } });
      await prisma.notificationJob.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}
