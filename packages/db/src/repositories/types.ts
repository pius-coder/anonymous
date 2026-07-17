import type {
  FapshiWireStatus,
  LedgerDirection,
  LedgerType,
  PaymentInternalStatus,
  PaymentStatus,
  ProviderServiceKind,
  WebhookInboxStatus,
  EncryptedSecretPurpose,
  DataClassification,
  RetentionAction,
  ComplianceGateStatus,
  IncidentStatus,
  SupportAccessStatus,
  ConsentStatus,
  EncryptionKeyStatus,
  ReconciliationStatus,
} from "@prisma/client";

export type CreateUserData = {
  email: string;
  name?: string;
  avatarUrl?: string;
  passwordHash?: string;
  sessionVersion?: number;
};

export type CreatePartyData = {
  code: string;
  name: string;
  visibility?: string;
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  scheduledAt?: Date;
  entryFeeAmount?: number;
  entryFeeCurrency?: string;
  configVersion?: number;
  feeVersion?: number;
  description?: string;
};

export type CreateParticipationData = {
  partyId: string;
  userId: string;
  role?: string;
  status?: string;
  paymentState?: string;
  admissionState?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
};

export type CreateRoundData = {
  partyId: string;
  number: number;
  minigame: string;
  status?: string;
  deadline?: Date;
  runtimeVersion?: string;
  configVersion?: number;
};

export type UpdateRoundLifecycleData = {
  status?: string;
  startedAt?: Date | null;
  deadline?: Date | null;
};

export type UpsertRoundDeadlineData = {
  roundId: string;
  deadlineAt?: Date | null;
  durationMs: number;
  pausedAt?: Date | null;
  remainingMs?: number | null;
  closedAt?: Date | null;
};

export type UpdateRoundDeadlineData = Partial<Omit<UpsertRoundDeadlineData, "roundId">>;

export type CreatePlayerActionData = {
  roundId: string;
  participationId: string;
  actionType: string;
  actionNonce: string;
  payload?: unknown;
  accepted?: boolean;
  rejectReason?: string | null;
};

export type CreateProvisionalScoreData = {
  roundId: string;
  participationId: string;
  score?: number;
  status?: string;
  evidence?: unknown;
  evidenceHash?: string;
};

export type CreateScoreReviewData = {
  provisionalScoreId: string;
  reviewedBy: string;
  action: string;
  reason?: string;
  previousScore?: number;
  newScore?: number;
};

export type CreateAuditLogData = {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
  result?: string;
  correlationId?: string;
  reason?: string;
};

export type CreateAnnouncementData = {
  partyId?: string;
  title: string;
  body: string;
  createdBy: string;
};

export type CreateNotificationJobData = {
  userId: string;
  type: string;
  payload: unknown;
  status?: string;
  idempotencyKey?: string;
  availableAt?: Date;
  maxAttempts?: number;
};

export type CreateDeliveryLogData = {
  jobId: string;
  channel: string;
  status: string;
  error?: string;
  deliveredAt?: Date;
};

export type CreateWalletData = {
  userId: string;
  currency?: string;
};

export type CreatePaymentTransactionData = {
  walletId?: string;
  userId?: string;
  partyId?: string;
  participationId?: string;
  amount: number;
  currency?: string;
  type: string;
  provider?: string;
  reference?: string;
  idempotencyKey?: string;
  status?: PaymentStatus | string;
  internalStatus?: PaymentInternalStatus;
  wireStatus?: FapshiWireStatus;
  providerExternalId?: string;
  providerTransId?: string;
  checkoutUrl?: string;
  expiresAt?: Date;
  serviceKind?: ProviderServiceKind;
  credentialRefId?: string;
};

export type UpdateTransactionStatusData = {
  status: PaymentStatus | string;
  provider?: string;
  reference?: string;
  internalStatus?: PaymentInternalStatus;
  wireStatus?: FapshiWireStatus;
  settledAt?: Date | null;
  /** Official Fapshi fields after initiate-pay / status reconcile */
  providerExternalId?: string | null;
  providerTransId?: string | null;
  checkoutUrl?: string | null;
  expiresAt?: Date | null;
};

export type CreateLedgerEntryFullData = {
  transactionId: string;
  debit: number;
  credit: number;
  balance: number;
  reason: string;
  idempotencyKey?: string;
  walletId?: string;
  balanceAfter?: number;
  direction?: LedgerDirection;
  ledgerType?: LedgerType;
  compensationOfId?: string;
};

export type ListTransactionsFilter = {
  skip?: number;
  take?: number;
  status?: PaymentStatus | string;
  walletId?: string;
  serviceKind?: ProviderServiceKind;
  type?: string;
  userId?: string;
  createdAfter?: Date;
};

export type CreateAuthSessionData = {
  userId: string;
  token: string;
  expiresAt: Date;
  sessionVersion?: number;
};

export type UpdateUserSessionData = {
  sessionVersion?: number;
  lastLoginAt?: Date;
};

export type CreatePasswordResetTokenData = {
  userId: string;
  token: string;
  expiresAt: Date;
};

export type CreateRealtimeConnectionData = {
  participationId: string;
  connectionId: string;
  state: string;
  tokenHash: string;
  tokenExpiresAt: Date;
};

export type RealtimeConnectionWithParticipation = {
  id: string;
  participationId: string;
  connectionId: string;
  state: string;
  tokenHash: string;
  tokenExpiresAt: Date;
  connectedAt: Date;
  disconnectedAt: Date | null;
  participation: {
    id: string;
    partyId: string;
    userId: string;
    role: string;
    status: string;
  };
};

export type IngestWebhookData = {
  provider: string;
  externalEventId: string;
  providerTransId?: string;
  wireStatus?: FapshiWireStatus;
  paymentId?: string;
  redactedSummary?: string;
  serviceKind?: ProviderServiceKind;
};

export type CreateCheckpointData = {
  roundId: string;
  version: number;
  phase: string;
  configVersion?: number;
  runtimeVersion?: string;
  payloadCipher: Uint8Array;
  payloadNonce?: Uint8Array;
  payloadHash: string;
  keyId: string;
  acceptedInputIds?: unknown;
  deadlines?: unknown;
  classification?: DataClassification;
};

export type CreateEncryptedSecretData = {
  purpose: EncryptedSecretPurpose;
  classification?: DataClassification;
  entityType: string;
  entityId: string;
  ciphertext: Uint8Array;
  nonce?: Uint8Array;
  keyId: string;
  aad?: string;
  roundId?: string;
  participationId?: string;
};

export type CreateEncryptionKeyData = {
  keyId: string;
  purpose: EncryptedSecretPurpose;
  algorithm?: string;
  status?: EncryptionKeyStatus;
  wrappedMaterial?: Uint8Array;
  kmsKeyRef?: string;
  createdByUserId?: string;
};

export type CreateRetentionRuleData = {
  domain: string;
  entityType: string;
  retainDays: number;
  action?: RetentionAction;
  notes?: string;
  active?: boolean;
};

export type CreateIncidentData = {
  partyId?: string;
  subject: string;
  description?: string;
  status?: IncidentStatus;
  openedById?: string;
};

export type CreateComplianceGateData = {
  partyId?: string;
  gateType: string;
  status?: ComplianceGateStatus;
  summary?: string;
  evidenceRefs?: unknown;
};

export type CreateConsentData = {
  userId: string;
  policyKey: string;
  policyVersion: string;
  status?: ConsentStatus;
  metadata?: unknown;
};

export type CreateSupportAccessData = {
  ticketId: string;
  requestedById: string;
  purpose: EncryptedSecretPurpose;
  reason: string;
  keyId?: string;
  status?: SupportAccessStatus;
  expiresAt?: Date;
};

export type CreateManifestData = {
  key: string;
  family: string;
  name: string;
  version: string;
  enabled?: boolean;
  resolverId?: string;
  config?: unknown;
  production?: boolean;
};

export type CreateTeamAssignmentData = {
  partyId: string;
  teamKey: string;
  roundId?: string;
  captainParticipationId?: string;
  memberParticipationIds: string[];
};

export type CreatePairAssignmentData = {
  partyId: string;
  pairKey: string;
  participationAId: string;
  participationBId?: string;
  roundId?: string;
  unpaired?: boolean;
};

export type {
  PaymentStatus,
  PaymentInternalStatus,
  FapshiWireStatus,
  ProviderServiceKind,
  LedgerDirection,
  LedgerType,
  WebhookInboxStatus,
  ReconciliationStatus,
  EncryptedSecretPurpose,
  DataClassification,
  RetentionAction,
  ComplianceGateStatus,
  IncidentStatus,
  SupportAccessStatus,
  ConsentStatus,
  EncryptionKeyStatus,
};
