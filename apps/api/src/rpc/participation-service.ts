/**
 * ParticipationService ConnectRPC implementation (A-ACQUISITION).
 * Exported for SEQ-03 central router mount — do not register here.
 *
 * Note: cancel remains REST `/v1/parties/:code/cancel` until a Cancel RPC is contracted.
 */
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { ParticipationV1 } from "@session-jeu/contracts";
import {
  getParticipationById,
  listPartyParticipations,
  ParticipationUseCaseError,
  registerForPartyById,
  type ParticipationDetail,
} from "../use-cases/party/participation.use-case.js";
import {
  connectCodeFromHttpStatus,
  requireRpcRole,
  requireRpcUser,
} from "./auth-context.js";

function toRole(role: string): ParticipationV1.ParticipationRole {
  switch (role) {
    case "player":
      return ParticipationV1.ParticipationRole.PLAYER;
    case "observer":
      return ParticipationV1.ParticipationRole.OBSERVER;
    case "admin":
      return ParticipationV1.ParticipationRole.ADMIN;
    default:
      return ParticipationV1.ParticipationRole.UNSPECIFIED;
  }
}

function fromRole(role: ParticipationV1.ParticipationRole): string {
  switch (role) {
    case ParticipationV1.ParticipationRole.OBSERVER:
      return "observer";
    case ParticipationV1.ParticipationRole.ADMIN:
      return "admin";
    case ParticipationV1.ParticipationRole.PLAYER:
    default:
      return "player";
  }
}

function toStatus(status: string): ParticipationV1.ParticipationStatus {
  switch (status) {
    case "INVITED":
      return ParticipationV1.ParticipationStatus.INVITED;
    case "REGISTERED":
    case "PAID":
    case "PRESENT":
    case "READY":
      return ParticipationV1.ParticipationStatus.JOINED;
    case "IN_ROOM":
    case "PLAYING":
    case "DISCONNECTED":
      return ParticipationV1.ParticipationStatus.ACTIVE;
    case "FINISHED_ROUND":
    case "WAITING_REVIEW":
    case "RESULTS_VISIBLE":
      return ParticipationV1.ParticipationStatus.COMPLETED;
    case "ABANDONED":
      return ParticipationV1.ParticipationStatus.NO_SHOW;
    case "COMPLETED":
      return ParticipationV1.ParticipationStatus.COMPLETED;
    default:
      return ParticipationV1.ParticipationStatus.UNSPECIFIED;
  }
}

function toResponse(detail: ParticipationDetail) {
  return {
    partyId: { value: detail.partyId },
    playerId: { value: detail.userId },
    role: toRole(detail.role),
    status: toStatus(detail.status),
  };
}

function handleParticipationError(error: unknown): never {
  if (error instanceof ParticipationUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

function correlationKey(request: { correlationId?: { value?: string } | undefined }): string | undefined {
  const value = request.correlationId?.value?.trim();
  return value || undefined;
}

/**
 * Public export for SEQ-03: `router.service(ParticipationV1.ParticipationService, participationService)`.
 */
export const participationService: Partial<ServiceImpl<typeof ParticipationV1.ParticipationService>> = {
  async attachParticipation(request, context) {
    const user = await requireRpcUser(context);
    const partyId = request.partyId?.value?.trim();
    if (!partyId) {
      throw new ConnectError("party_id est requis", Code.InvalidArgument);
    }

    // Player identity is always the authenticated user (never trust client player_id for admission).
    if (request.playerId?.value && request.playerId.value !== user.id) {
      throw new ConnectError("player_id ne peut pas être usurpé", Code.PermissionDenied);
    }

    const role = fromRole(request.role);
    if (role !== "player") {
      // Observer/admin attach is out of scope for player acquisition path.
      throw new ConnectError("Seul le rôle joueur est admis ici", Code.PermissionDenied);
    }

    try {
      const detail = await registerForPartyById({
        partyId,
        userId: user.id,
        idempotencyKey: correlationKey(request),
      });
      return { participationId: detail.id };
    } catch (error) {
      handleParticipationError(error);
    }
  },

  async getParticipation(request, context) {
    const user = await requireRpcUser(context);
    const participationId = request.participationId?.trim();
    if (!participationId) {
      throw new ConnectError("participation_id est requis", Code.InvalidArgument);
    }

    try {
      const detail = await getParticipationById({
        participationId,
        userId: user.id,
        roles: user.roles,
      });
      return toResponse(detail);
    } catch (error) {
      handleParticipationError(error);
    }
  },

  async listParticipations(request, context) {
    // Capacity / roster reads are staff-only (no private player list on public catalogue).
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN", "SUPPORT");
    const partyId = request.partyId?.value?.trim();
    if (!partyId) {
      throw new ConnectError("party_id est requis", Code.InvalidArgument);
    }

    try {
      const list = await listPartyParticipations({ partyId });
      return {
        participations: list.map((item) => toResponse(item)),
      };
    } catch (error) {
      handleParticipationError(error);
    }
  },
};
