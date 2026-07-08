-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION', 'PAYMENT', 'CHECK_IN', 'RESULT', 'REMINDER', 'SHARE', 'SYSTEM');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "transactionalOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "category" "NotificationType" NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLog" (
    "id" TEXT NOT NULL,
    "notificationJobId" TEXT,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "optedIn" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "notificationJobId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT,
    "body" TEXT NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "NotificationPreference_whatsappOptIn_idx" ON "NotificationPreference"("whatsappOptIn");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_key" ON "MessageTemplate"("key");
CREATE INDEX "MessageTemplate_channel_category_idx" ON "MessageTemplate"("channel", "category");
CREATE INDEX "MessageTemplate_isApproved_idx" ON "MessageTemplate"("isApproved");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");
CREATE INDEX "NotificationJob_userId_idx" ON "NotificationJob"("userId");
CREATE INDEX "NotificationJob_sessionId_idx" ON "NotificationJob"("sessionId");
CREATE INDEX "NotificationJob_type_idx" ON "NotificationJob"("type");
CREATE INDEX "NotificationJob_channel_idx" ON "NotificationJob"("channel");
CREATE INDEX "NotificationJob_status_idx" ON "NotificationJob"("status");
CREATE INDEX "NotificationJob_scheduledFor_idx" ON "NotificationJob"("scheduledFor");

-- CreateIndex
CREATE INDEX "DeliveryLog_notificationJobId_idx" ON "DeliveryLog"("notificationJobId");
CREATE INDEX "DeliveryLog_userId_idx" ON "DeliveryLog"("userId");
CREATE INDEX "DeliveryLog_channel_status_idx" ON "DeliveryLog"("channel", "status");
CREATE INDEX "DeliveryLog_providerMessageId_idx" ON "DeliveryLog"("providerMessageId");
CREATE INDEX "DeliveryLog_createdAt_idx" ON "DeliveryLog"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_channel_idx" ON "ConsentRecord"("userId", "channel");
CREATE INDEX "ConsentRecord_optedIn_idx" ON "ConsentRecord"("optedIn");
CREATE INDEX "ConsentRecord_createdAt_idx" ON "ConsentRecord"("createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessage_notificationJobId_idx" ON "OutboundMessage"("notificationJobId");
CREATE INDEX "OutboundMessage_userId_idx" ON "OutboundMessage"("userId");
CREATE INDEX "OutboundMessage_sessionId_idx" ON "OutboundMessage"("sessionId");
CREATE INDEX "OutboundMessage_channel_status_idx" ON "OutboundMessage"("channel", "status");
CREATE INDEX "OutboundMessage_providerMessageId_idx" ON "OutboundMessage"("providerMessageId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryLog" ADD CONSTRAINT "DeliveryLog_notificationJobId_fkey" FOREIGN KEY ("notificationJobId") REFERENCES "NotificationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryLog" ADD CONSTRAINT "DeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_notificationJobId_fkey" FOREIGN KEY ("notificationJobId") REFERENCES "NotificationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
