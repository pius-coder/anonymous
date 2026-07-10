CREATE TYPE "RoundParticipantStatus" AS ENUM (
  'ACTIVE',
  'SPECTATOR',
  'NO_SHOW',
  'ELIMINATED'
);

CREATE TYPE "RoundAdmissionLock" AS ENUM (
  'ROUND_START',
  'CHALLENGE_REVEAL',
  'HAZARD_START',
  'MATCHMAKING_LOCK',
  'PAIRING_LOCK',
  'TEAM_LOCK',
  'ROLE_ASSIGNMENT_LOCK'
);

CREATE TABLE "RoundParticipant" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "RoundParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  "admissionLock" "RoundAdmissionLock" NOT NULL,
  "admittedAt" TIMESTAMP(3),
  "lockedOutAt" TIMESTAMP(3),
  "lockReason" TEXT,
  "teamId" TEXT,
  "pairId" TEXT,
  "role" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoundParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoundParticipant_roundId_userId_key"
  ON "RoundParticipant"("roundId", "userId");

CREATE INDEX "RoundParticipant_sessionId_idx"
  ON "RoundParticipant"("sessionId");

CREATE INDEX "RoundParticipant_userId_idx"
  ON "RoundParticipant"("userId");

CREATE INDEX "RoundParticipant_status_idx"
  ON "RoundParticipant"("status");

CREATE INDEX "RoundParticipant_admissionLock_idx"
  ON "RoundParticipant"("admissionLock");

CREATE INDEX "RoundParticipant_teamId_idx"
  ON "RoundParticipant"("teamId");

CREATE INDEX "RoundParticipant_pairId_idx"
  ON "RoundParticipant"("pairId");

ALTER TABLE "RoundParticipant"
  ADD CONSTRAINT "RoundParticipant_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundParticipant"
  ADD CONSTRAINT "RoundParticipant_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundParticipant"
  ADD CONSTRAINT "RoundParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
