/**
 * AdminService ConnectRPC implementation (P-A-ADMIN).
 * Exported for SEQ central router mount — do not register in routes.ts from this lot.
 */
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { AdminV1, SessionV1 } from "@session-jeu/contracts";
import {
  getAdminGameStateView,
  getReadonlySnapshotView,
  getSystemReadinessView,
  listAdminPartiesView,
} from "../use-cases/admin/admin-read.use-case.js";
import { PartyUseCaseError, type AdminPartyDetail } from "../use-cases/party/party.use-case.js";
import {
  connectCodeFromHttpStatus,
  requireRpcRole,
  requireRpcUser,
} from "./auth-context.js";

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

function toPartyStatus(status: string): SessionV1.PartyStatus {
  switch (status) {
    case "DRAFT":
      return SessionV1.PartyStatus.DRAFT;
    case "SCHEDULED":
      return SessionV1.PartyStatus.SCHEDULED;
    case "PREPARATION_OPEN":
      return SessionV1.PartyStatus.PREPARATION_OPEN;
    case "PREPARATION_LOCKED":
    case "READY_TO_START":
      return SessionV1.PartyStatus.READY_TO_START;
    case "ROUND_ACTIVE":
    case "ACTIVE_ROUND":
    case "ROUND_BRIEFING":
    case "ROUND_SETUP":
      return SessionV1.PartyStatus.ACTIVE_ROUND;
    case "ROUND_RESOLVING":
    case "ROUND_CLOSING":
      return SessionV1.PartyStatus.ROUND_RESOLVING;
    case "ROUND_VERIFICATION":
    case "WAITING_REVIEW":
      return SessionV1.PartyStatus.ROUND_VERIFICATION;
    case "RESULTS_PUBLISHED":
      return SessionV1.PartyStatus.RESULTS_PUBLISHED;
    case "COMPLETED":
      return SessionV1.PartyStatus.COMPLETED;
    case "CANCELLED":
      return SessionV1.PartyStatus.CANCELLED;
    default:
      return SessionV1.PartyStatus.UNSPECIFIED;
  }
}

function toVisibility(visibility: string): SessionV1.PartyVisibility {
  switch (visibility) {
    case "public":
      return SessionV1.PartyVisibility.PUBLIC;
    case "unlisted":
      return SessionV1.PartyVisibility.UNLISTED;
    case "private":
      return SessionV1.PartyVisibility.PRIVATE;
    default:
      return SessionV1.PartyVisibility.UNSPECIFIED;
  }
}

function minigameIdsFromProgram(roundProgram: unknown): string[] {
  if (!roundProgram || typeof roundProgram !== "object") return [];
  const program = roundProgram as { minigameIds?: unknown; selectedMinigameIds?: unknown };
  const raw = program.minigameIds ?? program.selectedMinigameIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

function configFromParty(party: AdminPartyDetail) {
  return {
    minPlayers: party.minPlayers ?? 0,
    maxPlayers: party.maxPlayers ?? 0,
    visibility: toVisibility(party.visibility),
    name: party.name,
    description: party.description ?? "",
    selectedMinigameIds: minigameIdsFromProgram(party.roundProgram),
  };
}

function handleError(error: unknown): never {
  if (error instanceof PartyUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

function pageTokenToSkip(pageToken: string): number {
  if (!pageToken) return 0;
  const n = Number.parseInt(pageToken, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function statusFilterToDb(status: SessionV1.PartyStatus): string | undefined {
  switch (status) {
    case SessionV1.PartyStatus.DRAFT:
      return "DRAFT";
    case SessionV1.PartyStatus.SCHEDULED:
      return "SCHEDULED";
    case SessionV1.PartyStatus.PREPARATION_OPEN:
      return "PREPARATION_OPEN";
    case SessionV1.PartyStatus.READY_TO_START:
      return "PREPARATION_LOCKED";
    case SessionV1.PartyStatus.ACTIVE_ROUND:
      return "ROUND_ACTIVE";
    case SessionV1.PartyStatus.ROUND_VERIFICATION:
      return "ROUND_VERIFICATION";
    case SessionV1.PartyStatus.RESULTS_PUBLISHED:
      return "RESULTS_PUBLISHED";
    case SessionV1.PartyStatus.COMPLETED:
      return "COMPLETED";
    case SessionV1.PartyStatus.CANCELLED:
      return "CANCELLED";
    default:
      return undefined;
  }
}

function toReadinessStatus(
  status: "UP" | "DEGRADED" | "DOWN",
): AdminV1.ReadinessComponentStatus {
  switch (status) {
    case "UP":
      return AdminV1.ReadinessComponentStatus.UP;
    case "DEGRADED":
      return AdminV1.ReadinessComponentStatus.DEGRADED;
    case "DOWN":
      return AdminV1.ReadinessComponentStatus.DOWN;
    default:
      return AdminV1.ReadinessComponentStatus.UNSPECIFIED;
  }
}

/**
 * Public export for SEQ: `router.service(AdminV1.AdminService, adminService)`.
 */
export const adminService: Partial<ServiceImpl<typeof AdminV1.AdminService>> = {
  async getGameState(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    const partyId = request.partyId?.value?.trim();
    if (!partyId) throw new ConnectError("party_id est requis", Code.InvalidArgument);

    try {
      const view = await getAdminGameStateView({ partyId, callerUserId: actor.id });
      return {
        state: {
          config: configFromParty(view.party),
          status: toPartyStatus(view.party.status),
          participants: view.participants.map((p) => ({
            playerId: { value: p.playerId },
            name: p.name,
            connectionStatus: p.connectionStatus,
            participationStatus: p.participationStatus,
            isReady: p.isReady,
          })),
          participantCount: view.participantCount,
          connectedCount: view.connectedCount,
          currentRoundId: view.currentRoundId ?? "",
          currentPhase: view.currentPhase,
        },
      };
    } catch (error) {
      handleError(error);
    }
  },

  async getReadonlySnapshot(request, context) {
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN", "SUPPORT");
    const partyId = request.partyId?.value?.trim();
    if (!partyId) throw new ConnectError("party_id est requis", Code.InvalidArgument);

    try {
      const snap = await getReadonlySnapshotView({ partyId });
      return {
        snapshot: {
          partyName: snap.partyName,
          status: toPartyStatus(snap.status),
          participantCount: snap.participantCount,
          roundCount: snap.roundCount,
          currentPhase: snap.currentPhase,
        },
      };
    } catch (error) {
      handleError(error);
    }
  },

  async listParties(request, context) {
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const pageSize = request.pageSize > 0 ? Math.min(request.pageSize, 100) : 30;
      const skip = pageTokenToSkip(request.pageToken);
      const status = statusFilterToDb(request.statusFilter);
      const result = await listAdminPartiesView({ status, skip, take: pageSize });
      const parties = result.parties.map((party) => ({
        config: configFromParty(party),
        status: toPartyStatus(party.status),
        participants: [],
        participantCount: party.participantCount,
        connectedCount: 0,
        currentRoundId: "",
        currentPhase: party.status,
      }));
      const nextSkip = skip + parties.length;
      return {
        parties,
        nextPageToken: nextSkip < result.total ? String(nextSkip) : "",
      };
    } catch (error) {
      handleError(error);
    }
  },

  async getSystemReadiness(request, context) {
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    // Touch user so auth is exercised even for ops probes.
    await requireRpcUser(context);
    try {
      const view = await getSystemReadinessView({ deep: request.deep });
      return {
        ready: view.ready,
        contractsVersion: view.contractsVersion,
        components: view.components.map((c) => ({
          name: c.name,
          status: toReadinessStatus(c.status),
          publicDetail: c.publicDetail,
        })),
        checkedAt: toTimestamp(view.checkedAt),
      };
    } catch (error) {
      handleError(error);
    }
  },
};
