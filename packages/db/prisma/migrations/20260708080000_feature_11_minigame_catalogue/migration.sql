CREATE TYPE "MiniGameFamily" AS ENUM ('SOLO', 'DUEL', 'ALLIANCE', 'TEAM', 'SURVIVAL', 'HIDDEN_ROLE');

CREATE TYPE "MiniGamePlayerMode" AS ENUM ('SOLO', 'DUEL', 'GROUP', 'TEAM');

ALTER TABLE "RoundInstance" ADD COLUMN "miniGameDefinitionId" TEXT;
ALTER TABLE "RoundInstance" ADD COLUMN "configJson" JSONB;

CREATE TABLE "MiniGameDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "family" "MiniGameFamily" NOT NULL,
    "playerMode" "MiniGamePlayerMode" NOT NULL,
    "resolverId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL,
    "configSchema" JSONB NOT NULL,
    "defaultConfig" JSONB NOT NULL,
    "allowedActions" JSONB NOT NULL,
    "antiCheatPolicy" JSONB NOT NULL,
    "clientStateSchema" JSONB NOT NULL,
    "uiCopy" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniGameDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MiniGameDefinition_key_version_key" ON "MiniGameDefinition"("key", "version");
CREATE INDEX "MiniGameDefinition_key_idx" ON "MiniGameDefinition"("key");
CREATE INDEX "MiniGameDefinition_family_idx" ON "MiniGameDefinition"("family");
CREATE INDEX "MiniGameDefinition_enabled_idx" ON "MiniGameDefinition"("enabled");
CREATE INDEX "MiniGameDefinition_createdBy_idx" ON "MiniGameDefinition"("createdBy");
CREATE INDEX "RoundInstance_miniGameDefinitionId_idx" ON "RoundInstance"("miniGameDefinitionId");

ALTER TABLE "MiniGameDefinition" ADD CONSTRAINT "MiniGameDefinition_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoundInstance" ADD CONSTRAINT "RoundInstance_miniGameDefinitionId_fkey" FOREIGN KEY ("miniGameDefinitionId") REFERENCES "MiniGameDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
