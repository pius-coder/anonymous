-- CreateEnum
CREATE TYPE "RiskSignalSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskSignalType" AS ENUM ('AUTHORIZATION_DENIED', 'WEBHOOK_SIGNATURE_FAILURE', 'MULTI_ACCOUNT', 'DEVICE_HASH', 'PAYMENT_PATTERN', 'ANTICHEAT', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "AntiCheatEventType" AS ENUM ('DOUBLE_SUBMIT', 'AUTO_CLICK', 'LATE_INPUT', 'LATENCY_ABUSE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ComplianceGateType" AS ENUM ('WITHDRAWAL', 'MINI_GAME_RISK', 'LEGAL_WORDING', 'PUBLIC_LAUNCH');

-- CreateEnum
CREATE TYPE "ComplianceGateStatus" AS ENUM ('BLOCKED', 'PASSED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('WARN_USER', 'FREEZE_WALLET', 'SUSPEND_USER', 'RESTRICT_SESSION', 'NOTE');

-- CreateTable
CREATE TABLE "AntiCheatEvent" (
    "id" TEXT NOT NULL,
    "type" "AntiCheatEventType" NOT NULL,
    "severity" "RiskSignalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "sessionId" TEXT,
    "roundId" TEXT,
    "playerActionId" TEXT,
    "userId" TEXT,
    "actionNonce" TEXT,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AntiCheatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSignal" (
    "id" TEXT NOT NULL,
    "type" "RiskSignalType" NOT NULL,
    "severity" "RiskSignalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "userId" TEXT,
    "sessionId" TEXT,
    "source" TEXT NOT NULL,
    "deviceHash" TEXT,
    "ipHash" TEXT,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceGate" (
    "id" TEXT NOT NULL,
    "type" "ComplianceGateType" NOT NULL,
    "status" "ComplianceGateStatus" NOT NULL DEFAULT 'BLOCKED',
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "type" "ModerationActionType" NOT NULL,
    "targetUserId" TEXT,
    "sessionId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AntiCheatEvent_type_idx" ON "AntiCheatEvent"("type");
CREATE INDEX "AntiCheatEvent_severity_idx" ON "AntiCheatEvent"("severity");
CREATE INDEX "AntiCheatEvent_sessionId_idx" ON "AntiCheatEvent"("sessionId");
CREATE INDEX "AntiCheatEvent_roundId_idx" ON "AntiCheatEvent"("roundId");
CREATE INDEX "AntiCheatEvent_userId_idx" ON "AntiCheatEvent"("userId");
CREATE INDEX "AntiCheatEvent_playerActionId_idx" ON "AntiCheatEvent"("playerActionId");
CREATE INDEX "AntiCheatEvent_createdAt_idx" ON "AntiCheatEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RiskSignal_type_idx" ON "RiskSignal"("type");
CREATE INDEX "RiskSignal_severity_idx" ON "RiskSignal"("severity");
CREATE INDEX "RiskSignal_userId_idx" ON "RiskSignal"("userId");
CREATE INDEX "RiskSignal_sessionId_idx" ON "RiskSignal"("sessionId");
CREATE INDEX "RiskSignal_deviceHash_idx" ON "RiskSignal"("deviceHash");
CREATE INDEX "RiskSignal_ipHash_idx" ON "RiskSignal"("ipHash");
CREATE INDEX "RiskSignal_createdAt_idx" ON "RiskSignal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_key_key" ON "RateLimitBucket"("scope", "key");
CREATE INDEX "RateLimitBucket_scope_idx" ON "RateLimitBucket"("scope");
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
CREATE INDEX "RateLimitBucket_blockedAt_idx" ON "RateLimitBucket"("blockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceGate_type_scope_key" ON "ComplianceGate"("type", "scope");
CREATE INDEX "ComplianceGate_type_idx" ON "ComplianceGate"("type");
CREATE INDEX "ComplianceGate_status_idx" ON "ComplianceGate"("status");
CREATE INDEX "ComplianceGate_scope_idx" ON "ComplianceGate"("scope");

-- CreateIndex
CREATE INDEX "ModerationAction_type_idx" ON "ModerationAction"("type");
CREATE INDEX "ModerationAction_targetUserId_idx" ON "ModerationAction"("targetUserId");
CREATE INDEX "ModerationAction_sessionId_idx" ON "ModerationAction"("sessionId");
CREATE INDEX "ModerationAction_actorId_idx" ON "ModerationAction"("actorId");
CREATE INDEX "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");

-- AddForeignKey
ALTER TABLE "AntiCheatEvent" ADD CONSTRAINT "AntiCheatEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AntiCheatEvent" ADD CONSTRAINT "AntiCheatEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoundInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AntiCheatEvent" ADD CONSTRAINT "AntiCheatEvent_playerActionId_fkey" FOREIGN KEY ("playerActionId") REFERENCES "PlayerAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AntiCheatEvent" ADD CONSTRAINT "AntiCheatEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskSignal" ADD CONSTRAINT "RiskSignal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceGate" ADD CONSTRAINT "ComplianceGate_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
