-- Feature 08 - Lobby, check-in and session preparation

ALTER TYPE "GameSessionStatus" ADD VALUE IF NOT EXISTS 'WAITING_START';
ALTER TYPE "GameSessionStatus" ADD VALUE IF NOT EXISTS 'LIVE';

ALTER TYPE "SessionRegistrationStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE "SessionRegistrationStatus" ADD VALUE IF NOT EXISTS 'IN_ROOM';
ALTER TYPE "SessionRegistrationStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TABLE "SessionRegistration"
  ADD COLUMN "checkedInAt" TIMESTAMP(3),
  ADD COLUMN "inRoomAt" TIMESTAMP(3),
  ADD COLUMN "noShowAt" TIMESTAMP(3);

CREATE TABLE "JoinToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JoinToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JoinToken_tokenHash_key" ON "JoinToken"("tokenHash");
CREATE INDEX "SessionRegistration_status_checkedInAt_idx" ON "SessionRegistration"("status", "checkedInAt");
CREATE INDEX "JoinToken_userId_idx" ON "JoinToken"("userId");
CREATE INDEX "JoinToken_sessionId_idx" ON "JoinToken"("sessionId");
CREATE INDEX "JoinToken_registrationId_idx" ON "JoinToken"("registrationId");
CREATE INDEX "JoinToken_expiresAt_idx" ON "JoinToken"("expiresAt");
CREATE INDEX "JoinToken_consumedAt_idx" ON "JoinToken"("consumedAt");

ALTER TABLE "JoinToken" ADD CONSTRAINT "JoinToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JoinToken" ADD CONSTRAINT "JoinToken_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JoinToken" ADD CONSTRAINT "JoinToken_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "SessionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
