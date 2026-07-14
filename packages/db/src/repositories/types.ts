import type {
  User,
  AuthSession,
  RoleAssignment,
  Party,
  PartyParticipation,
  RealtimeConnection,
  Round as RoundModel,
  RoundParticipant,
  ProvisionalScore,
  PublishedScore,
  ScoreReview,
  AuditLog,
  Announcement,
  NotificationJob,
  DeliveryLog,
  Wallet,
  PaymentTransaction,
  LedgerEntry,
} from "@prisma/client";

export type { User };
export type { AuthSession };
export type { RoleAssignment };
export type { Party };
export type { PartyParticipation };
export type { RealtimeConnection };
export type { RoundModel };
export type { RoundParticipant };
export type { ProvisionalScore };
export type { PublishedScore };
export type { ScoreReview };
export type { AuditLog };
export type { Announcement };
export type { NotificationJob };
export type { DeliveryLog };
export type { Wallet };
export type { PaymentTransaction };
export type { LedgerEntry };

export type CreateUserData = {
  email: string;
  name?: string;
  avatarUrl?: string;
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
