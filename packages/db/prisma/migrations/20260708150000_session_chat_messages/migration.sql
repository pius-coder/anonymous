CREATE TYPE "SessionChatMessageType" AS ENUM (
  'CHAT',
  'QUICK',
  'PING',
  'SYSTEM'
);

CREATE TYPE "SessionChatModerationStatus" AS ENUM (
  'VISIBLE',
  'HIDDEN',
  'FLAGGED'
);

CREATE TABLE "SessionChatMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SessionChatMessageType" NOT NULL DEFAULT 'CHAT',
  "body" TEXT NOT NULL,
  "x" DOUBLE PRECISION,
  "y" DOUBLE PRECISION,
  "moderationStatus" "SessionChatModerationStatus" NOT NULL DEFAULT 'VISIBLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionChatMessage_sessionId_createdAt_idx"
  ON "SessionChatMessage"("sessionId", "createdAt");

CREATE INDEX "SessionChatMessage_userId_idx"
  ON "SessionChatMessage"("userId");

CREATE INDEX "SessionChatMessage_type_idx"
  ON "SessionChatMessage"("type");

CREATE INDEX "SessionChatMessage_moderationStatus_idx"
  ON "SessionChatMessage"("moderationStatus");

ALTER TABLE "SessionChatMessage"
  ADD CONSTRAINT "SessionChatMessage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionChatMessage"
  ADD CONSTRAINT "SessionChatMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
