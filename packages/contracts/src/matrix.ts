/**
 * Frozen service/method inventory for SEQ-01.
 * Counts must stay aligned with packages/contracts/docs/service-transport-matrix.md
 */

export type TransportKind = "connect" | "websocket" | "rest_exception";
export type MethodAudience =
  | "public"
  | "player"
  | "admin"
  | "observer"
  | "support"
  | "finance"
  | "system"
  | "player_admin"
  | "public_admin";

export interface ServiceMethodSpec {
  name: string;
  transport: TransportKind;
  audience: MethodAudience;
}

export interface ServiceSpec {
  package: string;
  service: string;
  methods: ServiceMethodSpec[];
}

export const FROZEN_SERVICES: ServiceSpec[] = [
  {
    package: "identity/v1",
    service: "IdentityService",
    methods: [
      { name: "Register", transport: "connect", audience: "public" },
      { name: "Login", transport: "connect", audience: "public" },
      { name: "Logout", transport: "connect", audience: "player" },
      { name: "Authenticate", transport: "connect", audience: "system" },
      { name: "GetCurrentUser", transport: "connect", audience: "player" },
      { name: "RevokeSession", transport: "connect", audience: "player_admin" },
      { name: "RequestPasswordReset", transport: "connect", audience: "public" },
      { name: "ResetPassword", transport: "connect", audience: "public" },
    ],
  },
  {
    package: "session/v1",
    service: "SessionService",
    methods: [
      { name: "CreateParty", transport: "connect", audience: "admin" },
      { name: "ScheduleParty", transport: "connect", audience: "admin" },
      { name: "GetParty", transport: "connect", audience: "public_admin" },
      { name: "ListParties", transport: "connect", audience: "public_admin" },
    ],
  },
  {
    package: "participation/v1",
    service: "ParticipationService",
    methods: [
      { name: "AttachParticipation", transport: "connect", audience: "player" },
      { name: "GetParticipation", transport: "connect", audience: "player_admin" },
      { name: "ListParticipations", transport: "connect", audience: "admin" },
    ],
  },
  {
    package: "preparation/v1",
    service: "PreparationService",
    methods: [
      { name: "OpenPreparation", transport: "connect", audience: "admin" },
      { name: "MarkReady", transport: "connect", audience: "player" },
      { name: "SendAnnouncement", transport: "connect", audience: "admin" },
      { name: "ConfirmStart", transport: "connect", audience: "admin" },
      { name: "GetPreparationState", transport: "connect", audience: "player_admin" },
    ],
  },
  {
    package: "realtime/v1",
    service: "RealtimeAccessService",
    methods: [
      { name: "CreateLiveAccess", transport: "connect", audience: "player_admin" },
      { name: "GetPlayerState", transport: "connect", audience: "player_admin" },
      { name: "GetAdminGameSnapshot", transport: "connect", audience: "admin" },
      { name: "GetReadonlySnapshot", transport: "connect", audience: "observer" },
    ],
  },
  {
    package: "round/v1",
    service: "RoundService",
    methods: [
      { name: "ConfigureRound", transport: "connect", audience: "admin" },
      { name: "StartRound", transport: "connect", audience: "admin" },
      { name: "StartRoundBriefing", transport: "connect", audience: "admin" },
      { name: "ActivateRound", transport: "connect", audience: "admin" },
      { name: "PauseRound", transport: "connect", audience: "admin" },
      { name: "ResumeRound", transport: "connect", audience: "admin" },
      { name: "SubmitPlayerCommand", transport: "connect", audience: "player" },
      { name: "CloseRound", transport: "connect", audience: "admin" },
      { name: "PlayerFinishedRound", transport: "connect", audience: "player" },
      { name: "GetRoundState", transport: "connect", audience: "player_admin" },
    ],
  },
  {
    package: "minigame/v1",
    service: "MiniGameService",
    methods: [
      { name: "ListMiniGames", transport: "connect", audience: "public_admin" },
      { name: "GetMiniGame", transport: "connect", audience: "public_admin" },
    ],
  },
  {
    package: "scoring/v1",
    service: "ScoringService",
    methods: [
      { name: "CorrectProvisionalScore", transport: "connect", audience: "admin" },
      { name: "PublishResults", transport: "connect", audience: "admin" },
      { name: "ListProvisionalScores", transport: "connect", audience: "admin" },
      { name: "GetPublishedResults", transport: "connect", audience: "player" },
    ],
  },
  {
    package: "admin/v1",
    service: "AdminService",
    methods: [
      { name: "GetGameState", transport: "connect", audience: "admin" },
      { name: "GetReadonlySnapshot", transport: "connect", audience: "observer" },
      { name: "ListParties", transport: "connect", audience: "admin" },
    ],
  },
  {
    package: "notification/v1",
    service: "NotificationService",
    methods: [
      { name: "SendNotification", transport: "connect", audience: "system" },
      { name: "GetNotificationStatus", transport: "connect", audience: "player_admin" },
      { name: "ListNotifications", transport: "connect", audience: "player" },
      { name: "AcknowledgeNotification", transport: "connect", audience: "player" },
    ],
  },
  {
    package: "payment/v1",
    service: "PaymentService",
    methods: [
      { name: "ProcessPayment", transport: "connect", audience: "player" },
      { name: "InitiateTransfer", transport: "connect", audience: "finance" },
      { name: "GetWallet", transport: "connect", audience: "player" },
      { name: "GetPaymentHistory", transport: "connect", audience: "player" },
    ],
  },
  {
    package: "compliance/v1",
    service: "ComplianceService",
    methods: [
      { name: "ListComplianceGates", transport: "connect", audience: "admin" },
      { name: "DecideComplianceGate", transport: "connect", audience: "admin" },
      { name: "OpenIncident", transport: "connect", audience: "support" },
      { name: "ListAuditEvents", transport: "connect", audience: "admin" },
      { name: "RecordAntiCheatEvent", transport: "connect", audience: "system" },
      { name: "ListRiskSignals", transport: "connect", audience: "admin" },
    ],
  },
];

export const FROZEN_SERVICE_COUNT = FROZEN_SERVICES.length;
export const FROZEN_METHOD_COUNT = FROZEN_SERVICES.reduce((n, s) => n + s.methods.length, 0);

/** Historical gap-analysis baseline before SEQ-01 compliance + ack. */
export const PRE_SEQ01_SERVICE_COUNT = 11;
export const PRE_SEQ01_METHOD_COUNT = 50;

export function getServiceMatrixSummary(): {
  services: number;
  methods: number;
  byService: Array<{ service: string; methods: number }>;
} {
  return {
    services: FROZEN_SERVICE_COUNT,
    methods: FROZEN_METHOD_COUNT,
    byService: FROZEN_SERVICES.map((s) => ({
      service: s.service,
      methods: s.methods.length,
    })),
  };
}
