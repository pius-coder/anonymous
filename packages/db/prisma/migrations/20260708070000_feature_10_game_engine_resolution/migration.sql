CREATE TYPE "RoundOutcomeStatus" AS ENUM ('QUALIFIED', 'ELIMINATED');

CREATE TABLE "RoundOutcome" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RoundOutcomeStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundOutcome_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResolutionLog" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "resolverId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputSnapshot" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "seedLog" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replayedAt" TIMESTAMP(3),

    CONSTRAINT "ResolutionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "roundId" TEXT,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoundOutcome_roundId_userId_key" ON "RoundOutcome"("roundId", "userId");
CREATE INDEX "RoundOutcome_sessionId_idx" ON "RoundOutcome"("sessionId");
CREATE INDEX "RoundOutcome_userId_idx" ON "RoundOutcome"("userId");
CREATE INDEX "RoundOutcome_status_idx" ON "RoundOutcome"("status");

CREATE UNIQUE INDEX "ResolutionLog_roundId_key" ON "ResolutionLog"("roundId");
CREATE INDEX "ResolutionLog_sessionId_idx" ON "ResolutionLog"("sessionId");
CREATE INDEX "ResolutionLog_resolverId_idx" ON "ResolutionLog"("resolverId");
CREATE INDEX "ResolutionLog_inputHash_idx" ON "ResolutionLog"("inputHash");
CREATE INDEX "ResolutionLog_outputHash_idx" ON "ResolutionLog"("outputHash");
CREATE INDEX "ResolutionLog_createdAt_idx" ON "ResolutionLog"("createdAt");

CREATE INDEX "GameEvent_sessionId_idx" ON "GameEvent"("sessionId");
CREATE INDEX "GameEvent_roundId_idx" ON "GameEvent"("roundId");
CREATE INDEX "GameEvent_eventType_idx" ON "GameEvent"("eventType");
CREATE INDEX "GameEvent_aggregateType_aggregateId_idx" ON "GameEvent"("aggregateType", "aggregateId");
CREATE INDEX "GameEvent_processedAt_idx" ON "GameEvent"("processedAt");
CREATE INDEX "GameEvent_createdAt_idx" ON "GameEvent"("createdAt");

ALTER TABLE "RoundOutcome" ADD CONSTRAINT "RoundOutcome_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundOutcome" ADD CONSTRAINT "RoundOutcome_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResolutionLog" ADD CONSTRAINT "ResolutionLog_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResolutionLog" ADD CONSTRAINT "ResolutionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
