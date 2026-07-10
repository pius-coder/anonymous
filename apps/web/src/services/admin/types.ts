export type AdminRole = "PLAYER" | "SUPPORT" | "FINANCE" | "ADMIN" | "SUPER_ADMIN";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

export type AdminDashboard = {
  role: AdminRole;
  scope: Record<string, boolean>;
  sessions: { total: number; live: number; completed: number };
  registrations: { paid: number; noShow: number };
  incidents: { open: number };
  support: { openCases: number; pendingActions: number };
  users: { total: number; active: number; players: number; operators: number };
  finance: null | {
    payments: { pending: number; successful: number; failed: number };
    wallets: { frozen: number };
    creditsDistributedXaf: number;
  };
};

export type AdminSession = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  entryFeeXaf: number;
  visibility: string;
  prizePoolBps: number;
  winnerSplitBps: number[];
  providerFeeBps: number;
  selectedMiniGameIds: string[] | null;
  configVersion: number;
  startsAt: string | null;
  registrationClosesAt: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdBy: string;
  paidRegistrationsCount?: number;
};

export type AdminSessionDetail = AdminSession & {
  registrations: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      profile?: { username: string; avatarUrl: string | null } | null;
    };
    payment: { id: string; status: string; amountXaf: number; providerTransId: string | null; createdAt: string } | null;
    checkedInAt: string | null;
    inRoomAt: string | null;
    noShowAt: string | null;
    cancelledAt: string | null;
  }>;
  rounds: Array<{
    id: string;
    order: number;
    miniGameId: string;
    miniGameName: string;
    configJson: unknown;
    durationMs: number;
    policy: unknown;
  }>;
  liveState: null | {
    id: string;
    sessionId: string;
    phase: string;
    previousPhase: string | null;
    currentRoundId: string | null;
    phaseStartedAt: string | null;
    pausedAt: string | null;
    pauseReason: string | null;
  };
  results: Array<{ id: string; userId: string; finalRank: number | null; finalStatus: string; prizeWonXaf: number }>;
  commissionRecord: null | {
    id: string;
    grossCollectionXaf: number;
    providerFeesXaf: number;
    netCollectionXaf: number;
    prizePoolXaf: number;
    organizationCommissionXaf: number;
    roundingRemainderXaf: number;
    createdAt: string;
  };
  disputeWindow: null | {
    id: string;
    status: string;
    reason: string | null;
    requestedById: string | null;
    requestedAt: string | null;
  };
};

export type PaymentTransaction = {
  id: string;
  session: { id: string; code: string; name: string } | null;
  user: { id: string; email: string; name: string | null };
  amountXaf: number;
  currency: string;
  status: string;
  provider: string;
  providerTransId: string | null;
  providerExternalId: string | null;
  registrationStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MiniGameDefinition = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  family: string;
  playerMode: string;
  resolverId: string;
  enabled: boolean;
  version: number;
  configSchema: unknown;
  defaultConfig: unknown;
};

export type AuditEntry = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  reason: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
};

export type SupportUser = {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile: { username: string; avatarUrl: string | null; isPublic: boolean; level: number; xp: number } | null;
  registrations: Array<{
    id: string;
    status: string;
    createdAt: string;
    session: { id: string; code: string; name: string; status: string; startTime: string | null };
  }>;
  payments: Array<{
    id: string;
    sessionId: string | null;
    registrationId: string | null;
    amountXaf: number;
    currency: string;
    status: string;
    provider: string;
    providerStatus: string | null;
    reference: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  wallet: null | {
    id: string;
    balanceXaf: number;
    currency: string;
    isFrozen: boolean;
    updatedAt: string;
    ledgers: Array<{
      id: string;
      amountXaf: number;
      balanceAfterXaf: number;
      direction: string;
      type: string;
      referenceType: string | null;
      referenceId: string | null;
      sessionId: string | null;
      createdAt: string;
    }>;
  };
  supportCases: Array<{
    id: string;
    status: string;
    subject: string;
    createdAt: string;
    closedAt: string | null;
  }>;
};

export type SupportUserSummary = {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  profile: { username: string; avatarUrl: string | null } | null;
  wallet: null | { balanceXaf: number; currency: string; isFrozen: boolean };
  registrationsCount: number;
  supportCasesCount: number;
};

export type Paginated<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type ComplianceGateStatus = "BLOCKED" | "PASSED" | "WAIVED";

export type ComplianceGate = {
  id: string;
  type: string;
  scope: string;
  status: ComplianceGateStatus;
  reason: string;
  decidedAt: string | null;
};
