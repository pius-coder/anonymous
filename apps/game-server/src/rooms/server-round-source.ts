import { partyRepository, roundRepository } from "@session-jeu/db";
import { mapDbRoundStatusToRoom, pickCurrentRound } from "./round-status.js";

export type ServerRoundSnapshot = {
  partyId: string;
  partyStatus: string;
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
};

/**
 * Loads authoritative party/round/deadline state from persistence.
 * Client join options must never override these fields.
 */
export async function loadServerRoundSnapshot(partyId: string): Promise<ServerRoundSnapshot> {
  const empty: ServerRoundSnapshot = {
    partyId,
    partyStatus: "",
    currentRoundId: "",
    currentRoundNumber: 0,
    currentRoundStatus: "",
    roundDeadlineAt: 0,
  };

  if (!partyId || partyId === "unknown") {
    return empty;
  }

  const party = await partyRepository.findPartyById(partyId).catch(() => null);
  const rounds = await roundRepository.listRoundsByParty(partyId).catch(() => []);
  const current = pickCurrentRound(rounds);

  let roundDeadlineAt = 0;
  if (current) {
    const deadlineState = await roundRepository
      .findRoundDeadlineByRoundId(current.id)
      .catch(() => null);
    if (deadlineState?.deadlineAt) {
      roundDeadlineAt = deadlineState.deadlineAt.getTime();
    } else if (current.deadline) {
      roundDeadlineAt = current.deadline.getTime();
    }
  }

  return {
    partyId,
    partyStatus: party?.status ?? "",
    currentRoundId: current?.id ?? "",
    currentRoundNumber: current?.number ?? 0,
    currentRoundStatus: current ? mapDbRoundStatusToRoom(current.status) : "",
    roundDeadlineAt,
  };
}
