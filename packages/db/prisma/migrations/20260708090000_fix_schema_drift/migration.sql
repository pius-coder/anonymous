-- Fix schema drift accumulated between init and feature migrations.
-- The committed init migration was edited after first apply, so the live DB
-- kept the old `isPublic boolean` and never received the `SessionVisibility`
-- enum, the `visibility` column, or the ShareLink table. This migration
-- reconciles the DB with the current schema.prisma without losing data.

-- CreateEnum
CREATE TYPE "SessionVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- Add nullable `visibility` column first so we can backfill from `isPublic`.
ALTER TABLE "GameSession" ADD COLUMN "visibility" "SessionVisibility";

-- Backfill: isPublic=true -> PUBLIC, isPublic=false -> UNLISTED (private-ish).
UPDATE "GameSession"
  SET "visibility" = CASE
    WHEN "isPublic" THEN 'PUBLIC'::"SessionVisibility"
    ELSE 'UNLISTED'::"SessionVisibility"
  END
WHERE "visibility" IS NULL;

-- Enforce NOT NULL and default after backfill.
ALTER TABLE "GameSession"
  ALTER COLUMN "visibility" SET NOT NULL,
  ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- Drop the legacy boolean column.
ALTER TABLE "GameSession" DROP COLUMN "isPublic";

-- Align defaults with schema.prisma (no defaults declared there).
ALTER TABLE "GameSession" ALTER COLUMN "winnerSplitBps" DROP DEFAULT;
ALTER TABLE "LedgerEntry" ALTER COLUMN "amountXaf" DROP DEFAULT;
ALTER TABLE "LedgerEntry" ALTER COLUMN "balanceAfterXaf" DROP DEFAULT;

-- CreateTable: ShareLink (was declared in schema but never created in DB)
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_token_idx" ON "ShareLink"("token");
CREATE INDEX "ShareLink_sessionId_idx" ON "ShareLink"("sessionId");

-- Note: providerTransId / providerExternalId unique indexes already exist
-- (created by feature_06_fapshi_payments as partial unique indexes).

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
