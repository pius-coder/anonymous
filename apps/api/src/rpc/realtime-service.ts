import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { RealtimeV1 } from "@session-jeu/contracts";
import {
  createLiveAccess,
  LiveAccessUseCaseError,
} from "../use-cases/live/live-access.use-case.js";
import { getReadonlySnapshotView } from "../use-cases/live/readonly-snapshot.use-case.js";
import { connectCodeFromHttpStatus, requireRpcRole, requireRpcUser } from "./auth-context.js";

function toTimestamp(value: string | Date) {
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

function requiredPartyId(request: { partyId?: { value: string } }): string {
  const partyId = request.partyId?.value.trim();
  if (!partyId) throw new ConnectError("party_id est requis", Code.InvalidArgument);
  return partyId;
}

function handleLiveError(error: unknown): never {
  if (error instanceof LiveAccessUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

export const realtimeService: Partial<ServiceImpl<typeof RealtimeV1.RealtimeAccessService>> = {
  async createLiveAccess(request, context) {
    const user = await requireRpcUser(context);
    try {
      const result = await createLiveAccess({
        partyId: requiredPartyId(request),
        userId: user.id,
      });
      return {
        connectionToken: result.connectionToken,
        roomId: result.roomId,
        endpoint: result.endpoint,
        expiresAt: toTimestamp(result.expiresAt),
      };
    } catch (error) {
      handleLiveError(error);
    }
  },

  async getReadonlySnapshot(request, context) {
    await requireRpcRole(context, "OBSERVER", "SUPPORT", "ADMIN", "SUPER_ADMIN");
    try {
      const result = await getReadonlySnapshotView({
        partyId: requiredPartyId(request),
      });
      return {
        snapshot: {
          currentPhase: result.currentPhase,
          participantCount: result.participantCount,
          rounds: result.rounds.map((round) => ({
            roundId: round.roundId,
            phase: round.phase,
            startedAt: round.startedAt ? toTimestamp(round.startedAt) : undefined,
            endsAt: round.endsAt ? toTimestamp(round.endsAt) : undefined,
          })),
          partyId: { value: result.partyId },
          connectedCount: result.connectedCount,
          currentRoundNumber: result.currentRoundNumber,
          currentRoundStatus: result.currentRoundStatus,
        },
      };
    } catch (error) {
      handleLiveError(error);
    }
  },
};
