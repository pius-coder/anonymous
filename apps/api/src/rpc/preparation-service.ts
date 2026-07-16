import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { PreparationV1 } from "@session-jeu/contracts";
import {
  confirmStart,
  getPreparationState,
  markReady,
  openPreparation,
  PreparationUseCaseError,
  sendPreparationAnnouncement,
} from "../use-cases/preparation/preparation.use-case.js";
import {
  connectCodeFromHttpStatus,
  requireRpcRole,
  requireRpcUser,
} from "./auth-context.js";

/**
 * ConnectRPC transport for PreparationService.
 * Mounting into the central router is owned by SEQ-03 (not this WAVE-A lot).
 * REST Hono routes remain available for lobby/admin until merge train wires RPC.
 */

function handlePreparationError(error: unknown): never {
  if (error instanceof PreparationUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

function ensureText(value: string | undefined, field: string): string {
  if (!value?.trim()) throw new ConnectError(`${field} est requis`, Code.InvalidArgument);
  return value.trim();
}

function toReadiness(status: string, readinessState: string): PreparationV1.ParticipantReadiness {
  if (status === "READY" || readinessState === "ready") {
    return PreparationV1.ParticipantReadiness.READY;
  }
  if (status === "PRESENT" || readinessState === "present") {
    return PreparationV1.ParticipantReadiness.NOT_READY;
  }
  if (readinessState === "noResponse") {
    return PreparationV1.ParticipantReadiness.NO_RESPONSE;
  }
  return PreparationV1.ParticipantReadiness.UNKNOWN;
}

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

export const preparationService: Partial<ServiceImpl<typeof PreparationV1.PreparationService>> = {
  async openPreparation(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      const result = await openPreparation({ partyId, userId: actor.id });
      return { preparationId: `${partyId}:${result.status}` };
    } catch (error) {
      handlePreparationError(error);
    }
  },

  async markReady(request, context) {
    const actor = await requireRpcUser(context);
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      // Actor is always the authenticated player; client player_id is ignored for authz.
      await markReady({ partyId, userId: actor.id });
      return {};
    } catch (error) {
      handlePreparationError(error);
    }
  },

  async sendAnnouncement(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      const title = ensureText(request.title, "title");
      const body = ensureText(request.body, "body");
      await sendPreparationAnnouncement({
        partyId,
        userId: actor.id,
        title,
        body,
      });
      return {};
    } catch (error) {
      handlePreparationError(error);
    }
  },

  async confirmStart(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      // Proto has confirmed_by only; absents override reason is REST-only until contract evolution (SEQ-01 ownership).
      await confirmStart({
        partyId,
        userId: actor.id,
        forceWithAbsents: false,
      });
      void request.confirmedBy;
      return {};
    } catch (error) {
      handlePreparationError(error);
    }
  },

  async getPreparationState(request, context) {
    await requireRpcUser(context);
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      const state = await getPreparationState({ partyId });
      return {
        participants: state.participants.map((p) => ({
          playerId: { value: p.userId },
          readiness: toReadiness(p.status, p.readinessState),
          lastSeenAt: toTimestamp(new Date()),
        })),
        allReady: state.stats.total > 0 && state.stats.ready === state.stats.total,
      };
    } catch (error) {
      handlePreparationError(error);
    }
  },
};
