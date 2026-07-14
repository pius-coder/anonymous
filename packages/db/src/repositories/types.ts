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
};

export type CreateParticipationData = {
  partyId: string;
  userId: string;
  role?: string;
  status?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
};

export type CreateRoundData = {
  partyId: string;
  number: number;
  minigame: string;
};

export type CreateProvisionalScoreData = {
  roundId: string;
  participationId: string;
  score?: number;
  status?: string;
  evidence?: unknown;
};

export type CreateAuditLogData = {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: unknown;
  ipAddress?: string;
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
};

export type CreateWalletData = {
  userId: string;
  currency?: string;
};

export type CreatePaymentTransactionData = {
  walletId: string;
  amount: number;
  type: string;
  provider?: string;
  reference?: string;
  status?: string;
};

export type UpdateTransactionStatusData = {
  status: string;
  provider?: string;
  reference?: string;
};

export type CreateLedgerEntryFullData = {
  transactionId: string;
  debit: number;
  credit: number;
  balance: number;
  reason: string;
  idempotencyKey?: string;
};

export type ListTransactionsFilter = {
  skip?: number;
  take?: number;
  status?: string;
  walletId?: string;
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
