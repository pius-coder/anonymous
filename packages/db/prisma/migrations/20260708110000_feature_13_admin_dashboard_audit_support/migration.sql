-- CreateEnum
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdminActionApprovalStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SupportCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SupportCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLog" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "sessionId" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionApproval" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "status" "AdminActionApprovalStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvalReason" TEXT,
    "payload" JSONB,
    "beforeData" JSONB,
    "afterData" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AdminActionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportCase_userId_idx" ON "SupportCase"("userId");

-- CreateIndex
CREATE INDEX "SupportCase_createdById_idx" ON "SupportCase"("createdById");

-- CreateIndex
CREATE INDEX "SupportCase_status_idx" ON "SupportCase"("status");

-- CreateIndex
CREATE INDEX "SupportCase_createdAt_idx" ON "SupportCase"("createdAt");

-- CreateIndex
CREATE INDEX "IncidentLog_createdById_idx" ON "IncidentLog"("createdById");

-- CreateIndex
CREATE INDEX "IncidentLog_sessionId_idx" ON "IncidentLog"("sessionId");

-- CreateIndex
CREATE INDEX "IncidentLog_severity_idx" ON "IncidentLog"("severity");

-- CreateIndex
CREATE INDEX "IncidentLog_category_idx" ON "IncidentLog"("category");

-- CreateIndex
CREATE INDEX "IncidentLog_createdAt_idx" ON "IncidentLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActionApproval_action_idx" ON "AdminActionApproval"("action");

-- CreateIndex
CREATE INDEX "AdminActionApproval_entity_entityId_idx" ON "AdminActionApproval"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AdminActionApproval_status_idx" ON "AdminActionApproval"("status");

-- CreateIndex
CREATE INDEX "AdminActionApproval_requestedById_idx" ON "AdminActionApproval"("requestedById");

-- CreateIndex
CREATE INDEX "AdminActionApproval_approvedById_idx" ON "AdminActionApproval"("approvedById");

-- CreateIndex
CREATE INDEX "AdminActionApproval_requestedAt_idx" ON "AdminActionApproval"("requestedAt");

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportCase" ADD CONSTRAINT "SupportCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLog" ADD CONSTRAINT "IncidentLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLog" ADD CONSTRAINT "IncidentLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionApproval" ADD CONSTRAINT "AdminActionApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionApproval" ADD CONSTRAINT "AdminActionApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
