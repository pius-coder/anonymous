import { partyRepository, participationRepository, roundRepository } from "@session-jeu/db";
import { CONTRACTS_VERSION } from "@session-jeu/contracts";
import {
  getAdminParty,
  listAdminParties,
  PartyUseCaseError,
  type AdminPartyDetail,
  type ListAdminPartiesResult,
} from "../party/party.use-case.js";
import { listPartyParticipations } from "../party/participation.use-case.js";
import { getLeaseStatus, type LeaseStatus } from "../../lib/admin-control-lease.js";

export type AdminParticipantView = {
  playerId: string;
  name: string;
  connectionStatus: string;
  participationStatus: string;
  isReady: boolean;
};

export type AdminGameStateView = {
  party: AdminPartyDetail;
  participants: AdminParticipantView[];
  participantCount: number;
  connectedCount: number;
  currentRoundId: string | null;
  currentPhase: string;
  lease: LeaseStatus;
};

export type AdminReadonlySnapshotView = {
  partyName: string;
  status: string;
  participantCount: number;
  roundCount: number;
  currentPhase: string;
};

export type SystemReadinessView = {
  ready: boolean;
  contractsVersion: string;
  components: Array<{ name: string; status: "UP" | "DEGRADED" | "DOWN"; publicDetail: string }>;
  checkedAt: string;
};

export async function getAdminGameStateView(input: {
  partyId: string;
  callerUserId?: string;
}): Promise<AdminGameStateView> {
  const party = await getAdminParty({ id: input.partyId });
  const listed = await listPartyParticipations({ partyId: input.partyId });

  const participants: AdminParticipantView[] = listed.map((p) => ({
    playerId: p.userId,
    name: p.userName ?? p.userId,
    connectionStatus: p.connectionState,
    participationStatus: p.status,
    isReady: p.readinessState === "ready" || p.readinessState === "READY",
  }));

  const connectedCount = participants.filter((p) =>
    ["connected", "CONNECTED", "online", "ONLINE"].includes(p.connectionStatus),
  ).length;

  let currentRoundId: string | null = null;
  let currentPhase = party.status;
  const rounds = await roundRepository.listRoundsByParty(input.partyId);
  if (rounds.length > 0) {
    const active =
      rounds.find((r) => ["ACTIVE", "BRIEFING", "SETUP", "SUSPENDED", "PAUSED"].includes(r.status)) ??
      rounds[rounds.length - 1];
    currentRoundId = active.id;
    currentPhase = active.status;
  }

  const lease = await getLeaseStatus(input.partyId, input.callerUserId);

  return {
    party,
    participants,
    participantCount: participants.length,
    connectedCount,
    currentRoundId,
    currentPhase,
    lease,
  };
}

export async function getReadonlySnapshotView(input: {
  partyId: string;
}): Promise<AdminReadonlySnapshotView> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }
  const participantCount = await participationRepository.countByPartyId(party.id);
  const rounds = await roundRepository.listRoundsByParty(party.id);
  return {
    partyName: party.name,
    status: party.status,
    participantCount,
    roundCount: rounds.length,
    currentPhase: party.status,
  };
}

export async function listAdminPartiesView(
  input: { status?: string; skip?: number; take?: number } = {},
): Promise<ListAdminPartiesResult> {
  return listAdminParties(input);
}

export async function getSystemReadinessView(input: { deep?: boolean } = {}): Promise<SystemReadinessView> {
  const components: SystemReadinessView["components"] = [
    { name: "api", status: "UP", publicDetail: "process up" },
    { name: "contracts", status: "UP", publicDetail: CONTRACTS_VERSION },
  ];

  if (input.deep) {
    try {
      await partyRepository.listParties(0, 1);
      components.push({ name: "postgres", status: "UP", publicDetail: "list parties ok" });
    } catch {
      components.push({ name: "postgres", status: "DOWN", publicDetail: "ping failed" });
    }
    components.push({
      name: "lease-store",
      status: process.env.REDIS_URL ? "UP" : "DEGRADED",
      publicDetail: process.env.REDIS_URL ? "redis configured" : "in-memory fallback",
    });
  }

  const ready = components.every((c) => c.status !== "DOWN");
  return {
    ready,
    contractsVersion: CONTRACTS_VERSION,
    components,
    checkedAt: new Date().toISOString(),
  };
}
