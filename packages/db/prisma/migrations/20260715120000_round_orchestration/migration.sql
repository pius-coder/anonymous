-- Round orchestration lifecycle state
ALTER TABLE "RoundParticipant" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';

CREATE TABLE "PlayerAction" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionNonce" TEXT NOT NULL,
    "payload" JSONB,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "rejectReason" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoundDeadline" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3),
    "durationMs" INTEGER NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "remainingMs" INTEGER,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundDeadline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerAction_roundId_participationId_actionNonce_key" ON "PlayerAction"("roundId", "participationId", "actionNonce");
CREATE INDEX "PlayerAction_roundId_idx" ON "PlayerAction"("roundId");
CREATE INDEX "PlayerAction_participationId_idx" ON "PlayerAction"("participationId");
CREATE INDEX "PlayerAction_accepted_idx" ON "PlayerAction"("accepted");
CREATE INDEX "PlayerAction_receivedAt_idx" ON "PlayerAction"("receivedAt");

CREATE UNIQUE INDEX "RoundDeadline_roundId_key" ON "RoundDeadline"("roundId");
CREATE INDEX "RoundDeadline_deadlineAt_idx" ON "RoundDeadline"("deadlineAt");
CREATE INDEX "RoundDeadline_closedAt_idx" ON "RoundDeadline"("closedAt");

CREATE INDEX "RoundParticipant_status_idx" ON "RoundParticipant"("status");

ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "PartyParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoundDeadline" ADD CONSTRAINT "RoundDeadline_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
