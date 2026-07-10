export type CatalogueMiniGameFamily =
  | "SOLO"
  | "DUEL"
  | "ALLIANCE"
  | "TEAM"
  | "SURVIVAL"
  | "HIDDEN_ROLE";

export type RoundAdmissionLockCode =
  | "CHALLENGE_REVEAL"
  | "HAZARD_START"
  | "MATCHMAKING_LOCK"
  | "PAIRING_LOCK"
  | "TEAM_LOCK"
  | "ROLE_ASSIGNMENT_LOCK";

export const ROUND_ADMISSION_LOCK_BY_FAMILY: Record<
  CatalogueMiniGameFamily,
  RoundAdmissionLockCode
> = {
  SOLO: "CHALLENGE_REVEAL",
  DUEL: "MATCHMAKING_LOCK",
  ALLIANCE: "PAIRING_LOCK",
  TEAM: "TEAM_LOCK",
  SURVIVAL: "HAZARD_START",
  HIDDEN_ROLE: "ROLE_ASSIGNMENT_LOCK",
};

const KNOWN_FAMILIES = new Set<string>(Object.keys(ROUND_ADMISSION_LOCK_BY_FAMILY));

export function normalizeMiniGameFamily(family: string): CatalogueMiniGameFamily {
  if (!KNOWN_FAMILIES.has(family)) {
    throw new Error(`Unsupported mini-game family for live admission: ${family}`);
  }
  return family as CatalogueMiniGameFamily;
}

export function admissionLockForFamily(family: string): RoundAdmissionLockCode {
  return ROUND_ADMISSION_LOCK_BY_FAMILY[normalizeMiniGameFamily(family)];
}

export function isPreRoundLivePhase(phase: string) {
  return phase === "LOBBY" || phase === "BRIEFING";
}

export function lateAdmissionReason(lock: RoundAdmissionLockCode) {
  return `late-after-${lock.toLowerCase().replaceAll("_", "-")}`;
}
