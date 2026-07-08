-- AlterTable
ALTER TABLE "PlayerProfile"
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "preferences" JSONB,
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayerStatsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionsPlayed" INTEGER NOT NULL DEFAULT 0,
    "sessionsWon" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgFinalRank" DOUBLE PRECISION,
    "creditsWonXaf" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatsSnapshot_userId_key" ON "PlayerStatsSnapshot"("userId");

-- CreateIndex
CREATE INDEX "PlayerStatsSnapshot_sessionsWon_idx" ON "PlayerStatsSnapshot"("sessionsWon");

-- CreateIndex
CREATE INDEX "PlayerStatsSnapshot_computedAt_idx" ON "PlayerStatsSnapshot"("computedAt");

-- AddForeignKey
ALTER TABLE "PlayerStatsSnapshot" ADD CONSTRAINT "PlayerStatsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
