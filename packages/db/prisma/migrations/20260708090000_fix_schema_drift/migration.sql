-- Fix schema drift accumulated between init and feature migrations.
-- NOTE: the committed init migration was later edited to already include the
-- `SessionVisibility` enum, the `visibility` column and the `ShareLink` table,
-- so this migration is now idempotent and only reconciles the legacy boolean
-- `isPublic` column when it is still present (older live DBs).

-- Align defaults with schema.prisma (no defaults declared there).
ALTER TABLE "GameSession" ALTER COLUMN "winnerSplitBps" DROP DEFAULT;
ALTER TABLE "LedgerEntry" ALTER COLUMN "amountXaf" DROP DEFAULT;
ALTER TABLE "LedgerEntry" ALTER COLUMN "balanceAfterXaf" DROP DEFAULT;

-- Backfill + drop legacy boolean only if it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'GameSession' AND column_name = 'isPublic'
  ) THEN
    UPDATE "GameSession"
      SET "visibility" = CASE
        WHEN "isPublic" THEN 'PUBLIC'::"SessionVisibility"
        ELSE 'UNLISTED'::"SessionVisibility"
      END
    WHERE "visibility" IS NULL;

    ALTER TABLE "GameSession" DROP COLUMN "isPublic";
  END IF;
END $$;
