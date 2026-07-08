-- Replace placeholder registration statuses with the payment reservation workflow.
ALTER TABLE "SessionRegistration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "SessionRegistrationStatus" RENAME TO "SessionRegistrationStatus_old";

CREATE TYPE "SessionRegistrationStatus" AS ENUM (
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED'
);

ALTER TABLE "SessionRegistration"
  ALTER COLUMN "status" TYPE "SessionRegistrationStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PAYMENT_PENDING'
      WHEN 'CONFIRMED' THEN 'PAID'
      WHEN 'WAITLISTED' THEN 'CREATED'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'CANCELLED'
    END
  )::"SessionRegistrationStatus";

ALTER TABLE "SessionRegistration"
  ALTER COLUMN "status" SET DEFAULT 'CREATED';

DROP TYPE "SessionRegistrationStatus_old";

-- Feature 05 reservation lifecycle fields.
ALTER TABLE "SessionRegistration" ADD COLUMN "paymentDeadlineAt" TIMESTAMP(3);
ALTER TABLE "SessionRegistration" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "SessionRegistration" ADD COLUMN "cancellationReason" TEXT;

UPDATE "SessionRegistration"
SET "paidAt" = COALESCE("paidAt", "updatedAt")
WHERE "status" = 'PAID';

UPDATE "SessionRegistration"
SET
  "cancelledAt" = COALESCE("cancelledAt", "updatedAt"),
  "cancellationReason" = COALESCE("cancellationReason", 'legacy-cancelled')
WHERE "status" = 'CANCELLED';

-- Previous unique key blocked re-registration after cancellation/expiration.
DROP INDEX IF EXISTS "SessionRegistration_userId_sessionId_key";

-- Only one active registration can exist per user/session.
CREATE UNIQUE INDEX "SessionRegistration_active_user_session_key"
  ON "SessionRegistration"("userId", "sessionId")
  WHERE "status" IN ('CREATED', 'PAYMENT_PENDING', 'PAID');

CREATE INDEX "SessionRegistration_sessionId_status_idx"
  ON "SessionRegistration"("sessionId", "status");

CREATE INDEX "SessionRegistration_status_paymentDeadlineAt_idx"
  ON "SessionRegistration"("status", "paymentDeadlineAt");
