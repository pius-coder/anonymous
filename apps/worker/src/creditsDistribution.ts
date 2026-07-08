import {
  LedgerDirection,
  LedgerType,
  Prisma,
  PrizeDistributionStatus,
  prisma,
} from "@session-jeu/db";

export type CreditsDistributionJobData = {
  sessionId?: string;
};

async function creditOneDistribution(input: { distributionId: string; now: Date }) {
  return prisma.$transaction(
    async (tx) => {
      const distribution = await tx.prizeDistribution.findUnique({
        where: { id: input.distributionId },
      });
      if (!distribution) return { type: "not-found" as const };
      if (distribution.status === PrizeDistributionStatus.CREDITED) {
        return { type: "already-credited" as const };
      }

      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey: distribution.idempotencyKey },
      });
      if (existingLedger) {
        await tx.prizeDistribution.update({
          where: { id: distribution.id },
          data: {
            status: PrizeDistributionStatus.CREDITED,
            paidAt: distribution.paidAt ?? input.now,
            creditedAt: distribution.creditedAt ?? input.now,
          },
        });
        return { type: "idempotent" as const };
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: distribution.userId },
        update: {},
        create: { userId: distribution.userId, balanceXaf: 0, currency: "XAF" },
      });
      if (wallet.isFrozen) {
        await tx.prizeDistribution.update({
          where: { id: distribution.id },
          data: { status: PrizeDistributionStatus.FAILED },
        });
        return { type: "wallet-frozen" as const };
      }

      const nextBalanceXaf = wallet.balanceXaf + distribution.amountXaf;
      const ledger = await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          userId: distribution.userId,
          amountXaf: distribution.amountXaf,
          balanceAfterXaf: nextBalanceXaf,
          direction: LedgerDirection.CREDIT,
          type: LedgerType.PRIZE,
          description: "Prize credit from finalized session",
          referenceType: "PrizeDistribution",
          referenceId: distribution.id,
          idempotencyKey: distribution.idempotencyKey,
          sessionId: distribution.sessionId,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceXaf: nextBalanceXaf,
          version: { increment: 1 },
        },
      });

      await tx.prizeDistribution.update({
        where: { id: distribution.id },
        data: {
          status: PrizeDistributionStatus.CREDITED,
          paidAt: input.now,
          creditedAt: input.now,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: distribution.userId,
          action: "wallet.prize-credited",
          entity: "PrizeDistribution",
          entityId: distribution.id,
          newData: {
            ledgerId: ledger.id,
            amountXaf: distribution.amountXaf,
            sessionId: distribution.sessionId,
          },
        },
      });

      return { type: "credited" as const };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function processCreditsDistribution(
  data: CreditsDistributionJobData,
  now = new Date(),
) {
  if (!data.sessionId) {
    throw new Error("sessionId is required");
  }

  const distributions = await prisma.prizeDistribution.findMany({
    where: {
      sessionId: data.sessionId,
      status: { in: [PrizeDistributionStatus.PENDING, PrizeDistributionStatus.FAILED] },
    },
    orderBy: [{ rank: "asc" }, { userId: "asc" }],
  });

  let credited = 0;
  let skipped = 0;
  let failed = 0;

  for (const distribution of distributions) {
    const result = await creditOneDistribution({ distributionId: distribution.id, now });
    if (result.type === "credited" || result.type === "idempotent") credited += 1;
    else if (result.type === "wallet-frozen") failed += 1;
    else skipped += 1;
  }

  if (credited > 0) {
    await prisma.gameEvent.create({
      data: {
        sessionId: data.sessionId,
        eventType: "credits.distributed",
        aggregateType: "GameSession",
        aggregateId: data.sessionId,
        payload: { credited, skipped, failed },
      },
    });
  }

  const remaining = await prisma.prizeDistribution.count({
    where: {
      sessionId: data.sessionId,
      status: { not: PrizeDistributionStatus.CREDITED },
    },
  });

  if (remaining === 0) {
    await prisma.gameEvent.create({
      data: {
        sessionId: data.sessionId,
        eventType: "results.published",
        aggregateType: "GameSession",
        aggregateId: data.sessionId,
        payload: { credited, skipped, failed },
      },
    });
  }

  return { sessionId: data.sessionId, credited, skipped, failed, remaining };
}
