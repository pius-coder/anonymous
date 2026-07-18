-- Add nullable idempotency keys for durable finance replay protection.
ALTER TABLE "PaymentTransaction" ADD COLUMN "idempotencyKey" TEXT;

ALTER TABLE "LedgerEntry" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "PaymentTransaction_idempotencyKey_key" ON "PaymentTransaction"("idempotencyKey");

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "LedgerEntry"("idempotencyKey");
