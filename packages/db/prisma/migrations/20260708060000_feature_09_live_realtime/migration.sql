CREATE TYPE "LivePhase" AS ENUM ('LOBBY', 'BRIEFING', 'ROUND_ACTIVE', 'RESOLVING', 'RESULTS', 'PAUSED');

CREATE TYPE "PlayerConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'RECONNECTING');

CREATE TABLE "LiveSessionState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roomId" TEXT,
    "phase" "LivePhase" NOT NULL DEFAULT 'LOBBY',
    "previousPhase" "LivePhase",
    "currentRoundId" TEXT,
    "phaseStartedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSessionState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveReservation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerConnection" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationId" TEXT,
    "roomId" TEXT,
    "colyseusSessionId" TEXT,
    "status" "PlayerConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "reconnectUntil" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoundDeadline" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundDeadline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerAction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionNonce" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveSessionState_sessionId_key" ON "LiveSessionState"("sessionId");
CREATE INDEX "LiveSessionState_phase_idx" ON "LiveSessionState"("phase");
CREATE INDEX "LiveSessionState_roomId_idx" ON "LiveSessionState"("roomId");
CREATE INDEX "LiveSessionState_currentRoundId_idx" ON "LiveSessionState"("currentRoundId");

CREATE UNIQUE INDEX "LiveReservation_tokenHash_key" ON "LiveReservation"("tokenHash");
CREATE INDEX "LiveReservation_userId_idx" ON "LiveReservation"("userId");
CREATE INDEX "LiveReservation_sessionId_idx" ON "LiveReservation"("sessionId");
CREATE INDEX "LiveReservation_registrationId_idx" ON "LiveReservation"("registrationId");
CREATE INDEX "LiveReservation_expiresAt_idx" ON "LiveReservation"("expiresAt");
CREATE INDEX "LiveReservation_consumedAt_idx" ON "LiveReservation"("consumedAt");

CREATE UNIQUE INDEX "PlayerConnection_sessionId_userId_key" ON "PlayerConnection"("sessionId", "userId");
CREATE INDEX "PlayerConnection_sessionId_status_idx" ON "PlayerConnection"("sessionId", "status");
CREATE INDEX "PlayerConnection_userId_idx" ON "PlayerConnection"("userId");
CREATE INDEX "PlayerConnection_roomId_idx" ON "PlayerConnection"("roomId");
CREATE INDEX "PlayerConnection_colyseusSessionId_idx" ON "PlayerConnection"("colyseusSessionId");
CREATE INDEX "PlayerConnection_reconnectUntil_idx" ON "PlayerConnection"("reconnectUntil");

CREATE UNIQUE INDEX "RoundDeadline_roundId_key" ON "RoundDeadline"("roundId");
CREATE INDEX "RoundDeadline_sessionId_idx" ON "RoundDeadline"("sessionId");
CREATE INDEX "RoundDeadline_deadlineAt_idx" ON "RoundDeadline"("deadlineAt");
CREATE INDEX "RoundDeadline_closedAt_idx" ON "RoundDeadline"("closedAt");

CREATE UNIQUE INDEX "PlayerAction_roundId_userId_actionNonce_key" ON "PlayerAction"("roundId", "userId", "actionNonce");
CREATE INDEX "PlayerAction_sessionId_idx" ON "PlayerAction"("sessionId");
CREATE INDEX "PlayerAction_roundId_idx" ON "PlayerAction"("roundId");
CREATE INDEX "PlayerAction_userId_idx" ON "PlayerAction"("userId");
CREATE INDEX "PlayerAction_acceptedAt_idx" ON "PlayerAction"("acceptedAt");
CREATE INDEX "PlayerAction_rejectedAt_idx" ON "PlayerAction"("rejectedAt");

ALTER TABLE "LiveSessionState" ADD CONSTRAINT "LiveSessionState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSessionState" ADD CONSTRAINT "LiveSessionState_currentRoundId_fkey" FOREIGN KEY ("currentRoundId") REFERENCES "RoundInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveReservation" ADD CONSTRAINT "LiveReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveReservation" ADD CONSTRAINT "LiveReservation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveReservation" ADD CONSTRAINT "LiveReservation_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SessionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerConnection" ADD CONSTRAINT "PlayerConnection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerConnection" ADD CONSTRAINT "PlayerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundDeadline" ADD CONSTRAINT "RoundDeadline_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundDeadline" ADD CONSTRAINT "RoundDeadline_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerAction" ADD CONSTRAINT "PlayerAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
