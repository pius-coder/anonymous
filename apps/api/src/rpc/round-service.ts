import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { RoundV1 } from "@session-jeu/contracts";
import { roundRepository } from "@session-jeu/db";
import {
  activateRound,
  closeRound,
  configureRound,
  finishPlayerRound,
  pauseRound,
  resumeRound,
  RoundUseCaseError,
  startRoundBriefing,
  type PlayerActionPayload,
  type RoundLifecycleResult,
} from "../use-cases/round/round.use-case.js";
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

function toRoundStatus(status: string): RoundV1.RoundStatus {
  switch (status) {
    case "SETUP":
      return RoundV1.RoundStatus.SETUP;
    case "BRIEFING":
      return RoundV1.RoundStatus.BRIEFING;
    case "ACTIVE":
      return RoundV1.RoundStatus.ACTIVE;
    case "SUSPENDED":
    case "PAUSED":
      return RoundV1.RoundStatus.PAUSED;
    case "CLOSING":
      return RoundV1.RoundStatus.RESOLVING;
    case "VERIFICATION":
    case "WAITING_REVIEW":
      return RoundV1.RoundStatus.WAITING_REVIEW;
    case "VERIFIED":
    case "RESOLVED":
    case "PUBLISHED":
      return RoundV1.RoundStatus.VERIFIED;
    case "CLOSED":
      return RoundV1.RoundStatus.CLOSED;
    default:
      return RoundV1.RoundStatus.UNSPECIFIED;
  }
}

function handleRoundError(error: unknown): never {
  if (error instanceof RoundUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

function ensureText(value: string | undefined, field: string): string {
  if (!value?.trim()) throw new ConnectError(`${field} est requis`, Code.InvalidArgument);
  return value;
}

function parsePayload(payload: Uint8Array): PlayerActionPayload | undefined {
  if (payload.byteLength === 0) return undefined;
  if (payload.byteLength > 4_096) {
    throw new ConnectError("Payload trop volumineux", Code.InvalidArgument);
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("invalid payload");
    }
    for (const value of Object.values(parsed)) {
      if (!["string", "number", "boolean"].includes(typeof value) && value !== null) {
        throw new Error("invalid payload value");
      }
    }
    return parsed as PlayerActionPayload;
  } catch {
    throw new ConnectError("Payload de manche invalide", Code.InvalidArgument);
  }
}

async function configureForActor(
  request: {
    partyId?: { value: string };
    roundNumber: number;
    minigameId: string;
    durationSeconds: number;
  },
  actorId: string,
): Promise<RoundLifecycleResult> {
  return configureRound({
    partyId: ensureText(request.partyId?.value, "party_id"),
    roundNumber: request.roundNumber,
    minigameId: ensureText(request.minigameId, "minigame_id"),
    configuredBy: actorId,
    durationSeconds: request.durationSeconds > 0 ? request.durationSeconds : undefined,
  });
}

export const roundService: Partial<ServiceImpl<typeof RoundV1.RoundService>> = {
  async configureRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await configureForActor(request, actor.id);
      return { roundId: result.roundId, status: toRoundStatus(result.status) };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async startRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const configured = await configureForActor(
        { ...request, durationSeconds: 0 },
        actor.id,
      );
      const result = await startRoundBriefing({ roundId: configured.roundId, actorId: actor.id });
      return {
        roundId: result.roundId,
        endsAt: toTimestamp(result.deadlineAt),
        status: toRoundStatus(result.status),
      };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async startRoundBriefing(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await startRoundBriefing({
        roundId: ensureText(request.roundId, "round_id"),
        actorId: actor.id,
      });
      return { roundId: result.roundId, status: toRoundStatus(result.status) };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async activateRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await activateRound({
        roundId: ensureText(request.roundId, "round_id"),
        actorId: actor.id,
      });
      return {
        roundId: result.roundId,
        startedAt: toTimestamp(new Date()),
        endsAt: toTimestamp(result.deadlineAt),
      };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async pauseRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await pauseRound({
        roundId: ensureText(request.roundId, "round_id"),
        actorId: actor.id,
        reason: request.reason || undefined,
      });
      const remainingSeconds = result.deadlineAt
        ? Math.max(0, Math.ceil((new Date(result.deadlineAt).getTime() - Date.now()) / 1_000))
        : 0;
      return { roundId: result.roundId, remainingSeconds };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async resumeRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await resumeRound({
        roundId: ensureText(request.roundId, "round_id"),
        actorId: actor.id,
      });
      return { roundId: result.roundId, endsAt: toTimestamp(result.deadlineAt) };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async submitPlayerCommand(request, context) {
    const user = await requireRpcUser(context);
    if (request.actionType !== "finish") {
      throw new ConnectError("Type d'action non supporté", Code.Unimplemented);
    }
    try {
      await finishPlayerRound({
        roundId: ensureText(request.roundId, "round_id"),
        userId: user.id,
        actionNonce: ensureText(request.actionNonce, "action_nonce"),
        payload: parsePayload(request.payload),
      });
      return { accepted: true, rejectReason: "" };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async closeRound(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const result = await closeRound({
        roundId: ensureText(request.roundId, "round_id"),
        actorId: actor.id,
        reason: request.closeReason || undefined,
        systemTriggered: false,
      });
      return { roundId: result.roundId, status: toRoundStatus(result.status) };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async playerFinishedRound(request, context) {
    const user = await requireRpcUser(context);
    try {
      const result = await finishPlayerRound({
        roundId: ensureText(request.roundId, "round_id"),
        userId: user.id,
        actionNonce: ensureText(request.actionNonce, "action_nonce"),
        payload: parsePayload(request.payload),
      });
      return {
        roundId: request.roundId,
        playerId: { value: user.id },
        participantStatus: RoundV1.RoundStatus.WAITING_REVIEW,
        duplicate: result.duplicate,
      };
    } catch (error) {
      handleRoundError(error);
    }
  },

  async getRoundState(request, context) {
    await requireRpcUser(context);
    const round = await roundRepository.findRoundById(ensureText(request.roundId, "round_id"));
    if (!round) throw new ConnectError("Manche introuvable", Code.NotFound);
    return {
      partyId: { value: round.partyId },
      roundNumber: round.number,
      status: toRoundStatus(round.status),
      startedAt: toTimestamp(round.startedAt),
      endsAt: toTimestamp(round.deadline),
    };
  },
};
