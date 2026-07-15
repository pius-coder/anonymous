/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `PartyParticipation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accessToken]` on the table `RealtimeConnection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accessToken` to the `RealtimeConnection` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenExpiresAt` to the `RealtimeConnection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PartyParticipation" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "RealtimeConnection" ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PartyParticipation_idempotencyKey_key" ON "PartyParticipation"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "RealtimeConnection_accessToken_key" ON "RealtimeConnection"("accessToken");

-- CreateIndex
CREATE INDEX "RealtimeConnection_accessToken_idx" ON "RealtimeConnection"("accessToken");
