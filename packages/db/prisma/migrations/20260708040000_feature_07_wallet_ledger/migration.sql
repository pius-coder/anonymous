-- Feature 07 - Wallet, ledger and internal credits

ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';

ALTER TABLE "Wallet"
  ADD COLUMN "balanceXaf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "Wallet"
SET "balanceXaf" = ROUND("balance")::INTEGER;

ALTER TABLE "LedgerEntry"
  ADD COLUMN "amountXaf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "balanceAfterXaf" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "referenceType" TEXT,
  ADD COLUMN "referenceId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "LedgerEntry"
SET
  "amountXaf" = ROUND("amount")::INTEGER,
  "idempotencyKey" = 'legacy-ledger-' || "id";

ALTER TABLE "LedgerEntry"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

ALTER TABLE "Wallet" DROP COLUMN "balance";
ALTER TABLE "LedgerEntry" DROP COLUMN "amount";

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
