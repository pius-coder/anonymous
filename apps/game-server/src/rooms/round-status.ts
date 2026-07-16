/**
 * Map DB round lifecycle statuses to room-facing statuses.
 * Source of truth is the server (DB), never client join options.
 */
const DB_TO_ROOM: Record<string, string> = {
  SETUP: "waiting",
  BRIEFING: "waiting",
  ACTIVE: "active",
  SUSPENDED: "paused",
  CLOSING: "closing",
  VERIFICATION: "verification",
  CLOSED: "closed",
  COMPLETED: "closed",
};

/** Statuses that indicate a live / in-progress round for room hydration. */
export const LIVE_ROUND_DB_STATUSES = [
  "ACTIVE",
  "BRIEFING",
  "SUSPENDED",
  "CLOSING",
  "VERIFICATION",
] as const;

export function mapDbRoundStatusToRoom(status: string | null | undefined): string {
  if (!status) return "waiting";
  return DB_TO_ROOM[status.toUpperCase()] ?? "waiting";
}

export function pickCurrentRound<T extends { status: string; number: number }>(
  rounds: T[],
): T | undefined {
  if (rounds.length === 0) return undefined;
  const live = rounds.filter((r) =>
    (LIVE_ROUND_DB_STATUSES as readonly string[]).includes(r.status.toUpperCase()),
  );
  if (live.length > 0) {
    return live.reduce((best, r) => (r.number >= best.number ? r : best));
  }
  return rounds.reduce((best, r) => (r.number >= best.number ? r : best));
}
