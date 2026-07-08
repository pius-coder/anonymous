CREATE TYPE "GameResultStatus" AS ENUM ('WINNER', 'ELIMINATED', 'COMPLETED');

CREATE TYPE "PrizeDistributionStatus" AS ENUM ('PENDING', 'CREDITED', 'FAILED');

CREATE TYPE "RoundingRemainderPolicy" AS ENUM ('FIRST_WINNER', 'PLATFORM_COMMISSION');

CREATE TYPE "DisputeWindowStatus" AS ENUM ('OPEN', 'CORRECTION_REQUESTED', 'RESOLVED', 'CLOSED');

ALTER TABLE "GameResult"
  ADD COLUMN "finalStatus" "GameResultStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "prizeWonXaf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "GameResult"
SET "idempotencyKey" = 'legacy:game-result:' || "sessionId" || ':' || "userId";

ALTER TABLE "GameResult" ALTER COLUMN "idempotencyKey" SET NOT NULL;

ALTER TABLE "PrizeDistribution"
  ADD COLUMN "amountXaf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "status" "PrizeDistributionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "creditedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PrizeDistribution"
SET "idempotencyKey" = 'legacy:prize-distribution:' || "sessionId" || ':' || "userId",
    "amountXaf" = floor("amount")::INTEGER,
    "status" = CASE WHEN "paidAt" IS NULL THEN 'PENDING'::"PrizeDistributionStatus" ELSE 'CREDITED'::"PrizeDistributionStatus" END,
    "creditedAt" = "paidAt";

ALTER TABLE "PrizeDistribution" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "grossCollectionXaf" INTEGER NOT NULL,
    "providerFeesXaf" INTEGER NOT NULL,
    "netCollectionXaf" INTEGER NOT NULL,
    "prizePoolXaf" INTEGER NOT NULL,
    "organizationCommissionXaf" INTEGER NOT NULL,
    "roundingRemainderXaf" INTEGER NOT NULL DEFAULT 0,
    "roundingRemainderPolicy" "RoundingRemainderPolicy" NOT NULL DEFAULT 'FIRST_WINNER',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisputeWindow" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "DisputeWindowStatus" NOT NULL DEFAULT 'OPEN',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT,
    "requestReason" TEXT,
    "requestedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameResult_idempotencyKey_key" ON "GameResult"("idempotencyKey");
CREATE INDEX "GameResult_finalStatus_idx" ON "GameResult"("finalStatus");
CREATE INDEX "GameResult_finalizedAt_idx" ON "GameResult"("finalizedAt");

CREATE UNIQUE INDEX "PrizeDistribution_idempotencyKey_key" ON "PrizeDistribution"("idempotencyKey");
CREATE INDEX "PrizeDistribution_status_idx" ON "PrizeDistribution"("status");
CREATE INDEX "PrizeDistribution_creditedAt_idx" ON "PrizeDistribution"("creditedAt");

CREATE UNIQUE INDEX "CommissionRecord_sessionId_key" ON "CommissionRecord"("sessionId");
CREATE UNIQUE INDEX "CommissionRecord_idempotencyKey_key" ON "CommissionRecord"("idempotencyKey");
CREATE INDEX "CommissionRecord_createdAt_idx" ON "CommissionRecord"("createdAt");

CREATE UNIQUE INDEX "DisputeWindow_sessionId_key" ON "DisputeWindow"("sessionId");
CREATE INDEX "DisputeWindow_status_idx" ON "DisputeWindow"("status");
CREATE INDEX "DisputeWindow_closesAt_idx" ON "DisputeWindow"("closesAt");
CREATE INDEX "DisputeWindow_requestedById_idx" ON "DisputeWindow"("requestedById");

ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeWindow" ADD CONSTRAINT "DisputeWindow_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeWindow" ADD CONSTRAINT "DisputeWindow_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
