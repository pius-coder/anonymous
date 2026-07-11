-- Keep the database invariant aligned with the application active registration policy.
-- Feature 08 added CHECKED_IN and IN_ROOM after the original partial unique index.
DROP INDEX IF EXISTS "SessionRegistration_active_user_session_key";

CREATE UNIQUE INDEX "SessionRegistration_active_user_session_key"
  ON "SessionRegistration"("userId", "sessionId")
  WHERE "status" IN ('CREATED', 'PAYMENT_PENDING', 'PAID', 'CHECKED_IN', 'IN_ROOM');
