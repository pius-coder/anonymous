import { RoundV1 } from "@session-jeu/contracts";
import { correlationId, rpcCall, rpcClients } from "@/lib/rpc";

type CommandResult = {
  roundId: string;
  status: string;
};

type PlayerFinishedResult = {
  status: string;
  duplicate: boolean;
};

export type ConfigureRoundRequest = {
  roundNumber: number;
  minigameId: string;
  durationSeconds: number;
  auditReason?: string;
};

export type FinishRoundRequest = {
  actionNonce: string;
  payload?: Record<string, string | number | boolean | null>;
};

export const RoundService = {
  async configure(partyId: string, body: ConfigureRoundRequest) {
    const result = await rpcCall(() =>
      rpcClients.rounds.configureRound({
        correlationId: correlationId("round-configure"),
        partyId: { value: partyId },
        roundNumber: body.roundNumber,
        minigameId: body.minigameId,
        durationSeconds: body.durationSeconds,
      }),
    );
    return mapCommand(result);
  },
  async startBriefing(roundId: string) {
    const result = await rpcCall(() =>
      rpcClients.rounds.startRoundBriefing({
        correlationId: correlationId("round-briefing"),
        roundId,
      }),
    );
    if (!result.success) return result;
    return {
      success: true as const,
      data: { roundId: result.data.roundId || roundId, status: enumName(result.data.status) },
    };
  },
  async activate(roundId: string) {
    const result = await rpcCall(() =>
      rpcClients.rounds.activateRound({
        correlationId: correlationId("round-activate"),
        roundId,
      }),
    );
    if (!result.success) return result;
    return { success: true as const, data: { roundId: result.data.roundId, status: "ACTIVE" } };
  },
  pause(roundId: string, auditReason: string) {
    return mapRoundMutation(
      rpcClients.rounds.pauseRound({
        correlationId: correlationId("round-pause"),
        roundId,
        reason: auditReason,
      }),
      roundId,
      "SUSPENDED",
    );
  },
  resume(roundId: string, auditReason: string) {
    void auditReason;
    return mapRoundMutation(
      rpcClients.rounds.resumeRound({
        correlationId: correlationId("round-resume"),
        roundId,
      }),
      roundId,
      "ACTIVE",
    );
  },
  close(roundId: string, auditReason: string) {
    return mapRoundMutation(
      rpcClients.rounds.closeRound({
        correlationId: correlationId("round-close"),
        roundId,
        closeReason: auditReason,
        systemTriggered: false,
      }),
      roundId,
      "VERIFICATION",
    );
  },
  finish(roundId: string, body: FinishRoundRequest) {
    return rpcCall(async () => {
      const response = await rpcClients.rounds.playerFinishedRound({
        correlationId: correlationId("round-finish"),
        roundId,
        actionNonce: body.actionNonce,
        payload: new TextEncoder().encode(JSON.stringify(body.payload ?? {})),
      });
      return {
        status: enumName(response.participantStatus),
        duplicate: response.duplicate,
      } satisfies PlayerFinishedResult;
    });
  },
};

function enumName(status: RoundV1.RoundStatus) {
  return RoundV1.RoundStatus[status] ?? "UNSPECIFIED";
}

async function mapCommand(
  result: Awaited<ReturnType<typeof rpcCall<{ roundId: string; status: RoundV1.RoundStatus }>>>,
) {
  if (!result.success) return result;
  return {
    success: true as const,
    data: { roundId: result.data.roundId, status: enumName(result.data.status) } satisfies CommandResult,
  };
}

async function mapRoundMutation(
  promise: Promise<unknown>,
  roundId: string,
  status: string,
) {
  const result = await rpcCall(() => promise);
  if (!result.success) return result;
  return { success: true as const, data: { roundId, status } satisfies CommandResult };
}
