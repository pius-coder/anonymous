export const CONTRACTS_VERSION = "v0.2.0-production";

export interface ContractsFoundation {
  version: string;
  packages: string[];
  protoRoots: string[];
  serviceCount: number;
  methodCount: number;
}

export function getContractsFoundation(): ContractsFoundation {
  return {
    version: CONTRACTS_VERSION,
    packages: [
      "admin/v1",
      "common/v1",
      "compliance/v1",
      "identity/v1",
      "minigame/v1",
      "notification/v1",
      "participation/v1",
      "payment/v1",
      "preparation/v1",
      "realtime/v1",
      "round/v1",
      "scoring/v1",
      "session/v1",
    ],
    protoRoots: ["proto"],
    serviceCount: 12,
    methodCount: 65,
  };
}

export * as AdminV1 from "./gen/admin/v1/admin_pb.js";
export * as CommonErrorsV1 from "./gen/common/v1/errors_pb.js";
export * as CommonV1 from "./gen/common/v1/shared_pb.js";
export * as ComplianceV1 from "./gen/compliance/v1/compliance_pb.js";
export * as IdentityV1 from "./gen/identity/v1/identity_pb.js";
export * as MiniGameV1 from "./gen/minigame/v1/manifest_pb.js";
export * as MiniGameDangerSweepV1 from "./gen/minigame/v1/danger_sweep_pb.js";
export * as MiniGameKeysV1 from "./gen/minigame/v1/game_keys_pb.js";
export * as MiniGameMemorySequenceV1 from "./gen/minigame/v1/memory_sequence_pb.js";
export * as MiniGamePureReactionDuelV1 from "./gen/minigame/v1/pure_reaction_duel_pb.js";
export * as MiniGameSilentVoteV1 from "./gen/minigame/v1/silent_vote_pb.js";
export * as MiniGameTeamRelayV1 from "./gen/minigame/v1/team_relay_pb.js";
export * as MiniGameTrustBridgeV1 from "./gen/minigame/v1/trust_bridge_pb.js";
export * as NotificationV1 from "./gen/notification/v1/notification_pb.js";
export * as ParticipationV1 from "./gen/participation/v1/participation_pb.js";
export * as PaymentV1 from "./gen/payment/v1/payment_pb.js";
export * as PreparationV1 from "./gen/preparation/v1/preparation_pb.js";
export * as RealtimeV1 from "./gen/realtime/v1/events_pb.js";
export * as RoundV1 from "./gen/round/v1/round_pb.js";
export * as ScoringV1 from "./gen/scoring/v1/scoring_pb.js";
export * as SessionV1 from "./gen/session/v1/session_pb.js";

export {
  AUDIENCE_FORBIDDEN,
  GLOBAL_FORBIDDEN_FIELDS,
  OBSERVER_FORBIDDEN_FIELDS,
  PLAYER_FORBIDDEN_FIELDS,
  SUPPORT_FORBIDDEN_FIELDS,
  assertAudienceSafe,
  findForbiddenFields,
  type AudienceRole,
} from "./audience.js";

export {
  FROZEN_METHOD_COUNT,
  FROZEN_SERVICE_COUNT,
  FROZEN_SERVICES,
  GAMEPLAY_PAYLOAD_MAX_BYTES,
  PRE_SEQ01_METHOD_COUNT,
  PRE_SEQ01_SERVICE_COUNT,
  PRODUCTION_CONTRACTS_VERSION,
  PRODUCTION_MINIGAME_KEYS,
  SEQ01_METHOD_COUNT,
  SEQ01_SERVICE_COUNT,
  getServiceMatrixSummary,
  type MethodAudience,
  type ServiceMethodSpec,
  type ServiceSpec,
  type TransportKind,
} from "./matrix.js";
