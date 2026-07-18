-- P-SEQ-03 production data model (expand-only from v0.1 baseline)
-- Forward: empty DB (via full chain) + upgrade from applied migrations.
-- Rollback: see packages/db/MIGRATION-NOTES.md (contract phase reverse).

-- ── Enums ──────────────────────────────────────────────────────────
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'REFUNDED', 'CREATED');
CREATE TYPE "PaymentInternalStatus" AS ENUM ('CREATED', 'AWAITING_PROVIDER', 'PROVIDER_PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'RECONCILING', 'RECONCILED', 'COMPENSATING', 'COMPENSATED', 'PENDING');
CREATE TYPE "FapshiWireStatus" AS ENUM ('UNSPECIFIED', 'CREATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED');
CREATE TYPE "ProviderServiceKind" AS ENUM ('COLLECTION', 'PAYOUT');
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "LedgerType" AS ENUM ('ENTRY_FEE', 'PRIZE', 'REFUND', 'BONUS', 'ADJUSTMENT', 'COMPENSATION', 'WALLET_CREDIT', 'ACCESS_FEE');
CREATE TYPE "WebhookInboxStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'APPLIED', 'DUPLICATE', 'REJECTED');
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MATCHED', 'MISMATCH', 'RESOLVED');
CREATE TYPE "EncryptionKeyStatus" AS ENUM ('ACTIVE', 'ROTATING', 'RETIRED', 'PURGED');
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'RESTRICTED', 'SYSTEM_ONLY', 'SECRET');
CREATE TYPE "EncryptedSecretPurpose" AS ENUM ('ROLE', 'VOTE', 'SEQUENCE', 'CHECKPOINT', 'SCORE_PROOF', 'OTHER');
CREATE TYPE "RetentionAction" AS ENUM ('KEEP', 'ANONYMIZE', 'DELETE', 'LEGAL_HOLD');
CREATE TYPE "ComplianceGateStatus" AS ENUM ('OPEN', 'BLOCKED', 'APPROVED', 'WAIVED');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportAccessStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN', 'SUPERSEDED');

-- ── Party fee / version ────────────────────────────────────────────
ALTER TABLE "Party" ADD COLUMN "entryFeeAmount" DECIMAL(18,2),
  ADD COLUMN "entryFeeCurrency" TEXT NOT NULL DEFAULT 'XAF',
  ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "feeVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "description" TEXT;

-- ── Participation payment / admission axes ─────────────────────────
ALTER TABLE "PartyParticipation" ADD COLUMN "paymentState" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "admissionState" TEXT NOT NULL DEFAULT 'NOT_ADMITTED',
  ADD COLUMN "paymentTransactionId" TEXT;
CREATE UNIQUE INDEX "PartyParticipation_paymentTransactionId_key" ON "PartyParticipation"("paymentTransactionId");
CREATE INDEX "PartyParticipation_partyId_admissionState_idx" ON "PartyParticipation"("partyId", "admissionState");
CREATE INDEX "PartyParticipation_partyId_paymentState_idx" ON "PartyParticipation"("partyId", "paymentState");
CREATE INDEX "PartyParticipation_partyId_status_idx" ON "PartyParticipation"("partyId", "status");

-- ── Round runtime version ──────────────────────────────────────────
ALTER TABLE "Round" ADD COLUMN "runtimeVersion" TEXT,
  ADD COLUMN "configVersion" INTEGER;
CREATE INDEX "Round_minigame_idx" ON "Round"("minigame");

-- ── Provisional / published evidence ───────────────────────────────
ALTER TABLE "ProvisionalScore" ADD COLUMN "evidenceHash" TEXT,
  ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'RESTRICTED';
CREATE INDEX "ProvisionalScore_evidenceHash_idx" ON "ProvisionalScore"("evidenceHash");

ALTER TABLE "PublishedScore" ADD COLUMN "evidenceHash" TEXT;

-- ── Audit result / correlation ─────────────────────────────────────
ALTER TABLE "AuditLog" ADD COLUMN "result" TEXT,
  ADD COLUMN "correlationId" TEXT,
  ADD COLUMN "reason" TEXT;
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");
CREATE INDEX "AuditLog_result_idx" ON "AuditLog"("result");

-- ── Notification job claims ────────────────────────────────────────
ALTER TABLE "NotificationJob" ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "claimToken" TEXT,
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimedBy" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");
CREATE INDEX "NotificationJob_status_availableAt_idx" ON "NotificationJob"("status", "availableAt");
CREATE INDEX "NotificationJob_claimToken_idx" ON "NotificationJob"("claimToken");

-- ── Wallet OCC / freeze ────────────────────────────────────────────
ALTER TABLE "Wallet" ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Wallet" ALTER COLUMN "balance" TYPE DECIMAL(18,2);

-- ── Provider credential refs (collection ≠ payout) ─────────────────
CREATE TABLE "ProviderCredentialRef" (
    "id" TEXT NOT NULL,
    "serviceKind" "ProviderServiceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "envKeyName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'fapshi',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderCredentialRef_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderCredentialRef_serviceKind_name_key" ON "ProviderCredentialRef"("serviceKind", "name");
CREATE INDEX "ProviderCredentialRef_serviceKind_isActive_idx" ON "ProviderCredentialRef"("serviceKind", "isActive");

-- ── PaymentTransaction expand ──────────────────────────────────────
-- Convert free-string status → enum (map unknown → PENDING)
ALTER TABLE "PaymentTransaction" ADD COLUMN "status_new" "PaymentStatus";
UPDATE "PaymentTransaction" SET "status_new" = CASE
  WHEN upper("status") IN ('PENDING','SUCCESSFUL','FAILED','EXPIRED','REFUNDED','CREATED') THEN upper("status")::"PaymentStatus"
  WHEN upper("status") = 'COMPLETED' THEN 'SUCCESSFUL'::"PaymentStatus"
  ELSE 'PENDING'::"PaymentStatus"
END;
ALTER TABLE "PaymentTransaction" DROP COLUMN "status";
ALTER TABLE "PaymentTransaction" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "PaymentTransaction" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "PaymentTransaction" ALTER COLUMN "walletId" DROP NOT NULL;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "amount" TYPE DECIMAL(18,2);

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "partyId" TEXT,
  ADD COLUMN "participationId" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'XAF',
  ADD COLUMN "internalStatus" "PaymentInternalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "wireStatus" "FapshiWireStatus" NOT NULL DEFAULT 'UNSPECIFIED',
  ADD COLUMN "providerExternalId" TEXT,
  ADD COLUMN "providerTransId" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "settledAt" TIMESTAMP(3),
  ADD COLUMN "serviceKind" "ProviderServiceKind" NOT NULL DEFAULT 'COLLECTION',
  ADD COLUMN "credentialRefId" TEXT;

-- Backfill internalStatus from status
UPDATE "PaymentTransaction" SET "internalStatus" = CASE "status"
  WHEN 'SUCCESSFUL' THEN 'SUCCEEDED'::"PaymentInternalStatus"
  WHEN 'FAILED' THEN 'FAILED'::"PaymentInternalStatus"
  WHEN 'EXPIRED' THEN 'EXPIRED'::"PaymentInternalStatus"
  WHEN 'CREATED' THEN 'CREATED'::"PaymentInternalStatus"
  ELSE 'PENDING'::"PaymentInternalStatus"
END;

CREATE INDEX "PaymentTransaction_userId_idx" ON "PaymentTransaction"("userId");
CREATE INDEX "PaymentTransaction_partyId_idx" ON "PaymentTransaction"("partyId");
CREATE INDEX "PaymentTransaction_participationId_idx" ON "PaymentTransaction"("participationId");
CREATE INDEX "PaymentTransaction_internalStatus_idx" ON "PaymentTransaction"("internalStatus");
CREATE INDEX "PaymentTransaction_serviceKind_idx" ON "PaymentTransaction"("serviceKind");
CREATE INDEX "PaymentTransaction_providerTransId_idx" ON "PaymentTransaction"("providerTransId");
CREATE INDEX "PaymentTransaction_providerExternalId_idx" ON "PaymentTransaction"("providerExternalId");
CREATE INDEX "PaymentTransaction_expiresAt_idx" ON "PaymentTransaction"("expiresAt");

-- Partial uniques for Fapshi IDs (NULL allowed multiple times)
CREATE UNIQUE INDEX "PaymentTransaction_providerTransId_unique"
  ON "PaymentTransaction"("providerTransId") WHERE "providerTransId" IS NOT NULL;
CREATE UNIQUE INDEX "PaymentTransaction_providerExternalId_unique"
  ON "PaymentTransaction"("providerExternalId") WHERE "providerExternalId" IS NOT NULL;

-- ── Ledger expand ──────────────────────────────────────────────────
ALTER TABLE "LedgerEntry" ALTER COLUMN "debit" TYPE DECIMAL(18,2);
ALTER TABLE "LedgerEntry" ALTER COLUMN "credit" TYPE DECIMAL(18,2);
ALTER TABLE "LedgerEntry" ALTER COLUMN "balance" TYPE DECIMAL(18,2);
ALTER TABLE "LedgerEntry"
  ADD COLUMN "walletId" TEXT,
  ADD COLUMN "balanceAfter" DECIMAL(18,2),
  ADD COLUMN "direction" "LedgerDirection",
  ADD COLUMN "ledgerType" "LedgerType",
  ADD COLUMN "compensationOfId" TEXT;
CREATE UNIQUE INDEX "LedgerEntry_compensationOfId_key" ON "LedgerEntry"("compensationOfId");
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");
CREATE INDEX "LedgerEntry_ledgerType_idx" ON "LedgerEntry"("ledgerType");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- Backfill walletId from transaction
UPDATE "LedgerEntry" le
SET "walletId" = pt."walletId",
    "balanceAfter" = le."balance",
    "direction" = CASE WHEN le."credit" > 0 THEN 'CREDIT'::"LedgerDirection" ELSE 'DEBIT'::"LedgerDirection" END
FROM "PaymentTransaction" pt
WHERE le."transactionId" = pt."id";

-- ── Webhook inbox ──────────────────────────────────────────────────
CREATE TABLE "ProviderWebhookInbox" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT,
    "providerTransId" TEXT,
    "wireStatus" "FapshiWireStatus" NOT NULL DEFAULT 'UNSPECIFIED',
    "inboxStatus" "WebhookInboxStatus" NOT NULL DEFAULT 'RECEIVED',
    "paymentId" TEXT,
    "redactedSummary" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "serviceKind" "ProviderServiceKind" NOT NULL DEFAULT 'COLLECTION',
    CONSTRAINT "ProviderWebhookInbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderWebhookInbox_provider_externalEventId_key"
  ON "ProviderWebhookInbox"("provider", "externalEventId");
CREATE INDEX "ProviderWebhookInbox_providerTransId_idx" ON "ProviderWebhookInbox"("providerTransId");
CREATE INDEX "ProviderWebhookInbox_inboxStatus_idx" ON "ProviderWebhookInbox"("inboxStatus");
CREATE INDEX "ProviderWebhookInbox_paymentId_idx" ON "ProviderWebhookInbox"("paymentId");
CREATE INDEX "ProviderWebhookInbox_receivedAt_idx" ON "ProviderWebhookInbox"("receivedAt");
CREATE INDEX "ProviderWebhookInbox_serviceKind_idx" ON "ProviderWebhookInbox"("serviceKind");

CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentReconciliation_paymentId_idx" ON "PaymentReconciliation"("paymentId");
CREATE INDEX "PaymentReconciliation_status_idx" ON "PaymentReconciliation"("status");

-- ── Encryption ─────────────────────────────────────────────────────
CREATE TABLE "EncryptionKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "purpose" "EncryptedSecretPurpose" NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "status" "EncryptionKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "wrappedMaterial" BYTEA,
    "kmsKeyRef" TEXT,
    "createdByUserId" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EncryptionKey_keyId_key" ON "EncryptionKey"("keyId");
CREATE INDEX "EncryptionKey_purpose_status_idx" ON "EncryptionKey"("purpose", "status");
CREATE INDEX "EncryptionKey_status_idx" ON "EncryptionKey"("status");

CREATE TABLE "EncryptedSecret" (
    "id" TEXT NOT NULL,
    "purpose" "EncryptedSecretPurpose" NOT NULL,
    "classification" "DataClassification" NOT NULL DEFAULT 'SECRET',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "nonce" BYTEA,
    "keyId" TEXT NOT NULL,
    "aad" TEXT,
    "purgedAt" TIMESTAMP(3),
    "roundId" TEXT,
    "participationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EncryptedSecret_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EncryptedSecret_entityType_entityId_idx" ON "EncryptedSecret"("entityType", "entityId");
CREATE INDEX "EncryptedSecret_purpose_idx" ON "EncryptedSecret"("purpose");
CREATE INDEX "EncryptedSecret_keyId_idx" ON "EncryptedSecret"("keyId");
CREATE INDEX "EncryptedSecret_roundId_idx" ON "EncryptedSecret"("roundId");
CREATE INDEX "EncryptedSecret_participationId_idx" ON "EncryptedSecret"("participationId");
CREATE INDEX "EncryptedSecret_purgedAt_idx" ON "EncryptedSecret"("purgedAt");

CREATE TABLE "RoundCheckpoint" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "configVersion" INTEGER,
    "runtimeVersion" TEXT,
    "payloadCipher" BYTEA NOT NULL,
    "payloadNonce" BYTEA,
    "payloadHash" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "acceptedInputIds" JSONB,
    "deadlines" JSONB,
    "classification" "DataClassification" NOT NULL DEFAULT 'SYSTEM_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundCheckpoint_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RoundCheckpoint_roundId_version_key" ON "RoundCheckpoint"("roundId", "version");
CREATE INDEX "RoundCheckpoint_roundId_idx" ON "RoundCheckpoint"("roundId");
CREATE INDEX "RoundCheckpoint_keyId_idx" ON "RoundCheckpoint"("keyId");

CREATE TABLE "ScoreEvidence" (
    "id" TEXT NOT NULL,
    "provisionalScoreId" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "nonce" BYTEA,
    "keyId" TEXT NOT NULL,
    "minigameVersion" TEXT,
    "classification" "DataClassification" NOT NULL DEFAULT 'SYSTEM_ONLY',
    "purgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScoreEvidence_provisionalScoreId_key" ON "ScoreEvidence"("provisionalScoreId");
CREATE INDEX "ScoreEvidence_evidenceHash_idx" ON "ScoreEvidence"("evidenceHash");
CREATE INDEX "ScoreEvidence_keyId_idx" ON "ScoreEvidence"("keyId");

-- ── Teams / pairs / manifests ──────────────────────────────────────
CREATE TABLE "TeamAssignment" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "roundId" TEXT,
    "teamKey" TEXT NOT NULL,
    "captainParticipationId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamAssignment_partyId_teamKey_roundId_key" ON "TeamAssignment"("partyId", "teamKey", "roundId");
CREATE INDEX "TeamAssignment_partyId_idx" ON "TeamAssignment"("partyId");
CREATE INDEX "TeamAssignment_roundId_idx" ON "TeamAssignment"("roundId");

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamMember_teamId_participationId_key" ON "TeamMember"("teamId", "participationId");
CREATE INDEX "TeamMember_participationId_idx" ON "TeamMember"("participationId");

CREATE TABLE "PairAssignment" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "roundId" TEXT,
    "pairKey" TEXT NOT NULL,
    "participationAId" TEXT NOT NULL,
    "participationBId" TEXT,
    "unpaired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PairAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PairAssignment_partyId_pairKey_roundId_key" ON "PairAssignment"("partyId", "pairKey", "roundId");
CREATE INDEX "PairAssignment_roundId_idx" ON "PairAssignment"("roundId");
CREATE INDEX "PairAssignment_participationAId_idx" ON "PairAssignment"("participationAId");
CREATE INDEX "PairAssignment_participationBId_idx" ON "PairAssignment"("participationBId");

CREATE TABLE "MinigameManifest" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "resolverId" TEXT,
    "config" JSONB,
    "production" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MinigameManifest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MinigameManifest_key_version_key" ON "MinigameManifest"("key", "version");
CREATE INDEX "MinigameManifest_key_idx" ON "MinigameManifest"("key");
CREATE INDEX "MinigameManifest_enabled_idx" ON "MinigameManifest"("enabled");

-- ── Compliance suite ───────────────────────────────────────────────
CREATE TABLE "ComplianceGate" (
    "id" TEXT NOT NULL,
    "partyId" TEXT,
    "gateType" TEXT NOT NULL,
    "status" "ComplianceGateStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "evidenceRefs" JSONB,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComplianceGate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ComplianceGate_partyId_idx" ON "ComplianceGate"("partyId");
CREATE INDEX "ComplianceGate_status_idx" ON "ComplianceGate"("status");
CREATE INDEX "ComplianceGate_gateType_idx" ON "ComplianceGate"("gateType");

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "partyId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Incident_partyId_idx" ON "Incident"("partyId");
CREATE INDEX "Incident_status_idx" ON "Incident"("status");
CREATE INDEX "Incident_openedAt_idx" ON "Incident"("openedAt");

CREATE TABLE "SupportAccessGrant" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "keyId" TEXT,
    "purpose" "EncryptedSecretPurpose" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SupportAccessStatus" NOT NULL DEFAULT 'REQUESTED',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportAccessGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportAccessGrant_ticketId_idx" ON "SupportAccessGrant"("ticketId");
CREATE INDEX "SupportAccessGrant_status_idx" ON "SupportAccessGrant"("status");
CREATE INDEX "SupportAccessGrant_requestedById_idx" ON "SupportAccessGrant"("requestedById");
CREATE INDEX "SupportAccessGrant_expiresAt_idx" ON "SupportAccessGrant"("expiresAt");

CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "metadata" JSONB,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConsentRecord_userId_policyKey_policyVersion_key" ON "ConsentRecord"("userId", "policyKey", "policyVersion");
CREATE INDEX "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");
CREATE INDEX "ConsentRecord_policyKey_idx" ON "ConsentRecord"("policyKey");
CREATE INDEX "ConsentRecord_status_idx" ON "ConsentRecord"("status");

CREATE TABLE "RetentionPolicyRule" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "retainDays" INTEGER NOT NULL,
    "action" "RetentionAction" NOT NULL DEFAULT 'KEEP',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RetentionPolicyRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RetentionPolicyRule_domain_entityType_key" ON "RetentionPolicyRule"("domain", "entityType");
CREATE INDEX "RetentionPolicyRule_active_idx" ON "RetentionPolicyRule"("active");

-- ── Foreign keys ───────────────────────────────────────────────────
ALTER TABLE "PartyParticipation" ADD CONSTRAINT "PartyParticipation_paymentTransactionId_fkey"
  FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_participationId_fkey"
  FOREIGN KEY ("participationId") REFERENCES "PartyParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_credentialRefId_fkey"
  FOREIGN KEY ("credentialRefId") REFERENCES "ProviderCredentialRef"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_compensationOfId_fkey"
  FOREIGN KEY ("compensationOfId") REFERENCES "LedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProviderWebhookInbox" ADD CONSTRAINT "ProviderWebhookInbox_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "PaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EncryptionKey" ADD CONSTRAINT "EncryptionKey_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EncryptedSecret" ADD CONSTRAINT "EncryptedSecret_keyId_fkey"
  FOREIGN KEY ("keyId") REFERENCES "EncryptionKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EncryptedSecret" ADD CONSTRAINT "EncryptedSecret_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EncryptedSecret" ADD CONSTRAINT "EncryptedSecret_participationId_fkey"
  FOREIGN KEY ("participationId") REFERENCES "PartyParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundCheckpoint" ADD CONSTRAINT "RoundCheckpoint_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoundCheckpoint" ADD CONSTRAINT "RoundCheckpoint_keyId_fkey"
  FOREIGN KEY ("keyId") REFERENCES "EncryptionKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScoreEvidence" ADD CONSTRAINT "ScoreEvidence_provisionalScoreId_fkey"
  FOREIGN KEY ("provisionalScoreId") REFERENCES "ProvisionalScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreEvidence" ADD CONSTRAINT "ScoreEvidence_keyId_fkey"
  FOREIGN KEY ("keyId") REFERENCES "EncryptionKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "TeamAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_participationId_fkey"
  FOREIGN KEY ("participationId") REFERENCES "PartyParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PairAssignment" ADD CONSTRAINT "PairAssignment_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PairAssignment" ADD CONSTRAINT "PairAssignment_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PairAssignment" ADD CONSTRAINT "PairAssignment_participationAId_fkey"
  FOREIGN KEY ("participationAId") REFERENCES "PartyParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PairAssignment" ADD CONSTRAINT "PairAssignment_participationBId_fkey"
  FOREIGN KEY ("participationBId") REFERENCES "PartyParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceGate" ADD CONSTRAINT "ComplianceGate_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_openedById_fkey"
  FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportAccessGrant" ADD CONSTRAINT "SupportAccessGrant_keyId_fkey"
  FOREIGN KEY ("keyId") REFERENCES "EncryptionKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
