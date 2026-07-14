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
