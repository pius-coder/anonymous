-- Align payment statuses with Fapshi provider status lifecycle.
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'SUCCESSFUL',
  'FAILED',
  'EXPIRED',
  'REFUNDED'
);

ALTER TABLE "PaymentTransaction"
  ALTER COLUMN "status" TYPE "PaymentStatus"
  USING (
    CASE "status"::text
      WHEN 'COMPLETED' THEN 'SUCCESSFUL'
      WHEN 'PENDING' THEN 'PENDING'
      WHEN 'FAILED' THEN 'FAILED'
      WHEN 'REFUNDED' THEN 'REFUNDED'
      ELSE 'FAILED'
    END
  )::"PaymentStatus";

ALTER TABLE "PaymentTransaction"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "PaymentStatus_old";

-- Fapshi payment metadata and registration linkage.
ALTER TABLE "PaymentTransaction" ADD COLUMN "registrationId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "amountXaf" INTEGER;
ALTER TABLE "PaymentTransaction" ADD COLUMN "providerExternalId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "providerTransId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "webhookReceivedAt" TIMESTAMP(3);

UPDATE "PaymentTransaction"
SET "amountXaf" = ROUND("amount")::INTEGER
WHERE "amountXaf" IS NULL;

ALTER TABLE "PaymentTransaction" ALTER COLUMN "amountXaf" SET NOT NULL;

CREATE UNIQUE INDEX "PaymentTransaction_registrationId_key"
  ON "PaymentTransaction"("registrationId");

CREATE UNIQUE INDEX "PaymentTransaction_providerExternalId_key"
  ON "PaymentTransaction"("providerExternalId")
  WHERE "providerExternalId" IS NOT NULL;

CREATE UNIQUE INDEX "PaymentTransaction_providerTransId_key"
  ON "PaymentTransaction"("providerTransId")
  WHERE "providerTransId" IS NOT NULL;

CREATE INDEX "PaymentTransaction_registrationId_idx"
  ON "PaymentTransaction"("registrationId");

CREATE INDEX "PaymentTransaction_provider_status_idx"
  ON "PaymentTransaction"("provider", "status");

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "SessionRegistration"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Raw webhook event log for idempotence and audit.
CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "paymentId" TEXT,
  "transId" TEXT,
  "status" TEXT,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookEvent_eventKey_key" ON "WebhookEvent"("eventKey");
CREATE INDEX "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");
CREATE INDEX "WebhookEvent_paymentId_idx" ON "WebhookEvent"("paymentId");
CREATE INDEX "WebhookEvent_transId_idx" ON "WebhookEvent"("transId");
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

ALTER TABLE "WebhookEvent"
  ADD CONSTRAINT "WebhookEvent_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
