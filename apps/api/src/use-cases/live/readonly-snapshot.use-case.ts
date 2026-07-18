import { participationRepository, partyRepository, roundRepository } from "@session-jeu/db";
import { LiveAccessUseCaseError } from "./live-access.use-case.js";

export type ReadonlyRoundView = {
  roundId: string;
  phase: string;
  startedAt?: string;
  endsAt?: string;
};

export type ReadonlySnapshotView = {
  partyId: string;
  currentPhase: string;
  participantCount: number;
  connectedCount: number;
  currentRoundNumber: number;
  currentRoundStatus: string;
  rounds: ReadonlyRoundView[];
};

const CONNECTED_STATES = new Set(["connected", "CONNECTED", "online", "ONLINE"]);
const ACTIVE_ROUND_STATUSES = new Set(["SETUP", "BRIEFING", "ACTIVE", "SUSPENDED", "PAUSED"]);

function toIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export async function getReadonlySnapshotView(input: {
  partyId: string;
}): Promise<ReadonlySnapshotView> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new LiveAccessUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const [participations, rounds] = await Promise.all([
    participationRepository.listParticipationsByParty(party.id),
    roundRepository.listRoundsByParty(party.id),
  ]);

  const currentRound =
    rounds.find((round) => ACTIVE_ROUND_STATUSES.has(round.status)) ?? rounds[rounds.length - 1] ?? null;

  return {
    partyId: party.id,
    currentPhase: currentRound?.status ?? party.status,
    participantCount: participations.length,
    connectedCount: participations.filter((participation) =>
      CONNECTED_STATES.has(participation.connectionState ?? ""),
    ).length,
    currentRoundNumber: currentRound?.number ?? 0,
    currentRoundStatus: currentRound?.status ?? "",
    rounds: rounds.map((round) => ({
      roundId: round.id,
      phase: round.status,
      startedAt: toIso(round.startedAt),
      endsAt: toIso(round.deadline),
    })),
  };
}
