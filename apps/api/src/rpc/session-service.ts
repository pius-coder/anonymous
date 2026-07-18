/**
 * SessionService ConnectRPC implementation (A-ACQUISITION).
 * Exported for SEQ-03 central router mount — do not register here.
 */
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { SessionV1 } from "@session-jeu/contracts";
import {
  createPartyDraft,
  getAdminParty,
  getPublicPartyById,
  listPublicParties,
  PartyUseCaseError,
  scheduleParty,
  type AdminPartyDetail,
  type PublicPartyDetail,
  type PublicPartyListItem,
} from "../use-cases/party/party.use-case.js";
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
    case "ACTIVE_ROUND":
      return SessionV1.PartyStatus.ACTIVE_ROUND;
    case "ROUND_RESOLVING":
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

function publicConfigFromListItem(party: PublicPartyListItem) {
  return {
    minPlayers: party.minPlayers ?? 0,
    maxPlayers: party.maxPlayers ?? 0,
    visibility: SessionV1.PartyVisibility.PUBLIC,
    name: party.name,
    // Public catalogue: never expose admin-only description/audit fields.
    description: "",
    selectedMinigameIds: [] as string[],
  };
}

function publicConfigFromDetail(party: PublicPartyDetail) {
  return {
    minPlayers: party.minPlayers ?? 0,
    maxPlayers: party.maxPlayers ?? 0,
    visibility: toVisibility(party.visibility),
    name: party.name,
    description: "",
    selectedMinigameIds: minigameIdsFromProgram(party.roundProgram),
  };
}

function adminConfigFromDetail(party: AdminPartyDetail) {
  return {
    minPlayers: party.minPlayers ?? 0,
    maxPlayers: party.maxPlayers ?? 0,
    visibility: toVisibility(party.visibility),
    name: party.name,
    description: "",
    selectedMinigameIds: minigameIdsFromProgram(party.roundProgram),
  };
}

function handlePartyError(error: unknown): never {
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

/**
 * Public export for SEQ-03: `router.service(SessionV1.SessionService, sessionService)`.
 */
export const sessionService: Partial<ServiceImpl<typeof SessionV1.SessionService>> = {
  async listParties(request) {
    try {
      const pageSize = request.pageSize > 0 ? Math.min(request.pageSize, 100) : 50;
      const skip = pageTokenToSkip(request.pageToken);
      const result = await listPublicParties({ skip, take: pageSize });
      // Public list only — drafts and non-public parties are filtered by the use-case.
      const parties = result.parties.map((party) => ({
        config: publicConfigFromListItem(party),
        status: toPartyStatus(party.status),
        createdAt: toTimestamp(party.scheduledAt ?? undefined),
        updatedAt: toTimestamp(party.scheduledAt ?? undefined),
      }));
      const nextSkip = skip + parties.length;
      const nextPageToken = nextSkip < result.total ? String(nextSkip) : "";
      return { parties, nextPageToken };
    } catch (error) {
      handlePartyError(error);
    }
  },

  async getParty(request, context) {
    const partyId = request.partyId?.value?.trim();
    if (!partyId) {
      throw new ConnectError("party_id est requis", Code.InvalidArgument);
    }

    try {
      // Staff may load any party; public callers only published public parties.
      const tokenUser = await requireRpcUser(context).catch(() => null);
      const isStaff =
        tokenUser?.roles.some((role) => ["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(role)) ??
        false;

      if (isStaff) {
        const admin = await getAdminParty({ id: partyId });
        return {
          config: adminConfigFromDetail(admin),
          status: toPartyStatus(admin.status),
          createdAt: toTimestamp(admin.createdAt),
          updatedAt: toTimestamp(admin.updatedAt),
        };
      }

      const pub = await getPublicPartyById({ id: partyId });
      return {
        config: publicConfigFromDetail(pub),
        status: toPartyStatus(pub.status),
        createdAt: toTimestamp(pub.createdAt),
        updatedAt: toTimestamp(pub.createdAt),
      };
    } catch (error) {
      handlePartyError(error);
    }
  },

  async createParty(request, context) {
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    const config = request.config;
    if (!config?.name?.trim()) {
      throw new ConnectError("config.name est requis", Code.InvalidArgument);
    }

    const codeSeed =
      config.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 12) || "PARTY";
    const code = `${codeSeed}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

    try {
      const created = await createPartyDraft({
        code,
        name: config.name.trim(),
        visibility:
          config.visibility === SessionV1.PartyVisibility.PRIVATE
            ? "private"
            : config.visibility === SessionV1.PartyVisibility.UNLISTED
              ? "unlisted"
              : "public",
        minPlayers: config.minPlayers || undefined,
        maxPlayers: config.maxPlayers || undefined,
        roundProgram:
          config.selectedMinigameIds.length > 0
            ? { minigameIds: config.selectedMinigameIds }
            : undefined,
      });
      return { partyId: { value: created.id } };
    } catch (error) {
      handlePartyError(error);
    }
  },

  async scheduleParty(request, context) {
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    const partyId = request.partyId?.value?.trim();
    if (!partyId) {
      throw new ConnectError("party_id est requis", Code.InvalidArgument);
    }
    if (!request.scheduledStart) {
      throw new ConnectError("scheduled_start est requis", Code.InvalidArgument);
    }
    const ms =
      Number(request.scheduledStart.seconds) * 1_000 +
      Math.floor(request.scheduledStart.nanos / 1_000_000);
    try {
      const updated = await scheduleParty({
        id: partyId,
        scheduledAt: new Date(ms).toISOString(),
      });
      return { partyId: { value: updated.id } };
    } catch (error) {
      handlePartyError(error);
    }
  },
};
