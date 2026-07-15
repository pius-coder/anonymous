export const CONTRACTS_VERSION = "v0.1";

export interface ContractsFoundation {
  version: string;
  packages: string[];
  protoRoots: string[];
}

export function getContractsFoundation(): ContractsFoundation {
  return {
    version: CONTRACTS_VERSION,
    packages: [
      "common/v1",
      "identity/v1",
      "session/v1",
      "participation/v1",
      "preparation/v1",
      "realtime/v1",
      "round/v1",
      "minigame/v1",
      "scoring/v1",
      "admin/v1",
      "notification/v1",
      "payment/v1",
    ],
    protoRoots: ["proto"],
  };
}

export * as AdminV1 from "./gen/admin/v1/admin_pb.js";
export * as CommonErrorsV1 from "./gen/common/v1/errors_pb.js";
export * as CommonV1 from "./gen/common/v1/shared_pb.js";
export * as IdentityV1 from "./gen/identity/v1/identity_pb.js";
export * as MiniGameV1 from "./gen/minigame/v1/manifest_pb.js";
export * as NotificationV1 from "./gen/notification/v1/notification_pb.js";
export * as ParticipationV1 from "./gen/participation/v1/participation_pb.js";
export * as PaymentV1 from "./gen/payment/v1/payment_pb.js";
export * as PreparationV1 from "./gen/preparation/v1/preparation_pb.js";
export * as RealtimeV1 from "./gen/realtime/v1/events_pb.js";
export * as RoundV1 from "./gen/round/v1/round_pb.js";
export * as ScoringV1 from "./gen/scoring/v1/scoring_pb.js";
export * as SessionV1 from "./gen/session/v1/session_pb.js";
