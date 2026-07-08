-- Feature 04 admin session configuration fields.
ALTER TABLE "GameSession" ADD COLUMN "minPlayers" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "GameSession" ADD COLUMN "entryFeeXaf" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameSession" ADD COLUMN "prizePoolBps" INTEGER NOT NULL DEFAULT 6000;
ALTER TABLE "GameSession" ADD COLUMN "winnerSplitBps" JSONB NOT NULL DEFAULT '[10000]';
ALTER TABLE "GameSession" ADD COLUMN "providerFeeBps" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "GameSession" ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GameSession" ADD COLUMN "registrationClosesAt" TIMESTAMP(3);
ALTER TABLE "GameSession" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "GameSession" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "GameSession" ADD COLUMN "cancellationReason" TEXT;

UPDATE "GameSession"
SET
  "entryFeeXaf" = GREATEST(0, ROUND("entryFee")::INTEGER),
  "publishedAt" = CASE
    WHEN "status" IN ('PUBLISHED', 'ACTIVE') THEN COALESCE("publishedAt", CURRENT_TIMESTAMP)
    ELSE "publishedAt"
  END,
  "cancelledAt" = CASE
    WHEN "status" = 'CANCELLED' THEN COALESCE("cancelledAt", CURRENT_TIMESTAMP)
    ELSE "cancelledAt"
  END;

CREATE INDEX "GameSession_configVersion_idx" ON "GameSession"("configVersion");

ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_capacity_check"
  CHECK ("minPlayers" >= 2 AND "maxPlayers" >= "minPlayers");

ALTER TABLE "GameSession"
  ADD CONSTRAINT "GameSession_xaf_bps_check"
  CHECK (
    "entryFeeXaf" >= 0
    AND "prizePoolBps" >= 0
    AND "prizePoolBps" <= 10000
    AND "providerFeeBps" >= 0
    AND "providerFeeBps" <= 10000
  );
