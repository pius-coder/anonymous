import {
  getRuntime,
  hashResolution,
  resolveRound,
  type PlayerAction,
  type ResolverConfig,
  type ResolverInput,
  type ResolverOutput,
  type RuntimeResolverInput,
} from "@session-jeu/game-engine";
import {
  Prisma,
  prisma,
  RoundOutcomeStatus,
  RoundParticipantStatus,
  RoundStatus,
} from "@session-jeu/db";
import { withSerializableRetry } from "../registrations/sessionRegistration.js";

export type FinalizeRoundInput = {
  roundId: string;
  config?: ResolverConfig;
};

function asActionPayload(payload: Prisma.JsonValue): PlayerAction["payload"] {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as PlayerAction["payload"];
  }
  return {};
}

function buildResolverInput(input: {
  round: { id: string };
  participants: string[];
  actions: Array<{
    userId: string;
    actionNonce: string;
    acceptedAt: Date | null;
    createdAt: Date;
    payload: Prisma.JsonValue;
  }>;
  config: ResolverConfig;
}): ResolverInput {
  return {
    roundId: input.round.id,
    participants: [...new Set(input.participants)].sort(),
    config: input.config,
    actions: input.actions
      .filter((action) => action.acceptedAt)
      .map((action) => ({
        playerId: action.userId,
        actionNonce: action.actionNonce,
        submittedAt: (action.acceptedAt ?? action.createdAt).toISOString(),
        payload: asActionPayload(action.payload),
      }))
      .sort((a, b) => `${a.playerId}:${a.actionNonce}`.localeCompare(`${b.playerId}:${b.actionNonce}`)),
    seedLog: [],
  };
}

function outputToRoundResultData(input: {
  output: ResolverOutput;
  sessionId: string;
  roundId: string;
}) {
  return input.output.ranking.map((entry) => ({
    roundId: input.roundId,
    playerId: entry.playerId,
    score: entry.score,
    rank: entry.rank,
    metadata: {
      resolverId: input.output.resolverId,
      qualified: input.output.qualifiedIds.includes(entry.playerId),
      eliminated: input.output.eliminatedIds.includes(entry.playerId),
      missingAction: entry.missingAction,
      tieBreakMs: entry.tieBreakMs,
    },
  }));
}

function outputToOutcomeData(input: {
  output: ResolverOutput;
  sessionId: string;
  roundId: string;
}) {
  return [
    ...input.output.qualifiedIds.map((userId) => ({
      roundId: input.roundId,
      sessionId: input.sessionId,
      userId,
      status: RoundOutcomeStatus.QUALIFIED,
      reason: "winners-count",
    })),
    ...input.output.eliminatedIds.map((userId) => ({
      roundId: input.roundId,
      sessionId: input.sessionId,
      userId,
      status: RoundOutcomeStatus.ELIMINATED,
      reason: "winners-count",
    })),
  ];
}

function outputToEvents(input: { output: ResolverOutput; sessionId: string; roundId: string }) {
  return [
    {
      sessionId: input.sessionId,
      roundId: input.roundId,
      eventType: "round.resolved",
      aggregateType: "RoundInstance",
      aggregateId: input.roundId,
      payload: input.output as unknown as Prisma.InputJsonValue,
    },
    ...input.output.qualifiedIds.map((userId) => ({
      sessionId: input.sessionId,
      roundId: input.roundId,
      eventType: "player.qualified",
      aggregateType: "User",
      aggregateId: userId,
      payload: { roundId: input.roundId, userId },
    })),
    ...input.output.eliminatedIds.map((userId) => ({
      sessionId: input.sessionId,
      roundId: input.roundId,
      eventType: "player.eliminated",
      aggregateType: "User",
      aggregateId: userId,
      payload: { roundId: input.roundId, userId },
    })),
  ];
}

export async function finalizeRound(input: FinalizeRoundInput) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const existing = await tx.resolutionLog.findUnique({
          where: { roundId: input.roundId },
        });
        if (existing) {
          return { type: "already-finalized" as const, resolutionLog: existing };
        }

        const round = await tx.roundInstance.findUnique({
          where: { id: input.roundId },
          include: {
            session: { select: { id: true } },
            playerActions: {
              where: { acceptedAt: { not: null } },
              select: {
                userId: true,
                actionNonce: true,
                acceptedAt: true,
                createdAt: true,
                payload: true,
              },
            },
          },
        });

        if (!round) return { type: "not-found" as const };
        if (round.status !== RoundStatus.COMPLETED) {
          return { type: "round-not-locked" as const, status: round.status };
        }

        const participants = await tx.roundParticipant.findMany({
          where: {
            roundId: round.id,
            status: RoundParticipantStatus.ACTIVE,
          },
          select: { userId: true },
          orderBy: { userId: "asc" },
        });
        if (participants.length === 0) {
          return { type: "invalid-input" as const, reason: "no-participants" };
        }

        let output: ResolverOutput;
        let inputHash: string;
        let inputSnapshot: Prisma.InputJsonValue;

        const participantIds = participants.map((p) => p.userId).sort();

        if (round.miniGameDefinitionId) {
          const definition = await tx.miniGameDefinition.findUnique({
            where: { id: round.miniGameDefinitionId },
          });
          if (definition) {
            const runtime = getRuntime(definition.key);
            if (runtime) {
              const actions = round.playerActions
                .filter((a) => a.acceptedAt)
                .map((a) => ({
                  playerId: a.userId,
                  actionNonce: a.actionNonce,
                  submittedAt: (a.acceptedAt ?? a.createdAt).toISOString(),
                  payload: asActionPayload(a.payload),
                }))
                .sort((a, b) =>
                  `${a.playerId}:${a.actionNonce}`.localeCompare(`${b.playerId}:${b.actionNonce}`),
                );

              const runtimeInput: RuntimeResolverInput = {
                roundId: round.id,
                participants: participantIds,
                actions,
                config: {
                  ...(definition.defaultConfig as Record<string, unknown>),
                  ...((round.configJson as Record<string, unknown>) ?? {}),
                },
                seed: ((round.configJson as Record<string, unknown>)?.seed as string) ?? round.id,
              };
              output = runtime.resolve(runtimeInput);
              inputHash = hashResolution(runtimeInput);
              inputSnapshot = runtimeInput as unknown as Prisma.InputJsonValue;
            } else {
              const config = input.config ?? {
                family: (definition.resolverId as "solo-score" | "duel-score") ?? "solo-score",
                winnersCount:
                  ((definition.defaultConfig as Record<string, unknown>)?.winnersCount as number) ?? 1,
              };
              const ri = buildResolverInput({ round, participants: participantIds, actions: round.playerActions, config });
              output = resolveRound(ri);
              inputHash = hashResolution(ri);
              inputSnapshot = ri as unknown as Prisma.InputJsonValue;
            }
          } else {
            const ri = buildResolverInput({ round, participants: participantIds, actions: round.playerActions, config: input.config ?? { family: "solo-score", winnersCount: 1 } });
            output = resolveRound(ri);
            inputHash = hashResolution(ri);
            inputSnapshot = ri as unknown as Prisma.InputJsonValue;
          }
        } else {
          const ri = buildResolverInput({ round, participants: participantIds, actions: round.playerActions, config: input.config ?? { family: "solo-score", winnersCount: 1 } });
          output = resolveRound(ri);
          inputHash = hashResolution(ri);
          inputSnapshot = ri as unknown as Prisma.InputJsonValue;
        }

        const outputHash = hashResolution(output);

        await tx.roundResult.createMany({
          data: outputToRoundResultData({
            output,
            sessionId: round.sessionId,
            roundId: round.id,
          }),
          skipDuplicates: true,
        });
        await tx.roundOutcome.createMany({
          data: outputToOutcomeData({
            output,
            sessionId: round.sessionId,
            roundId: round.id,
          }),
          skipDuplicates: true,
        });

        const resolutionLog = await tx.resolutionLog.create({
          data: {
            roundId: round.id,
            sessionId: round.sessionId,
            resolverId: output.resolverId,
            inputHash,
            outputHash,
            inputSnapshot,
            outputSnapshot: output as unknown as Prisma.InputJsonValue,
            evidence: output.evidence as unknown as Prisma.InputJsonValue,
            seedLog: output.seedLog as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.gameEvent.createMany({
          data: outputToEvents({ output, sessionId: round.sessionId, roundId: round.id }),
        });

        await tx.auditLog.create({
          data: {
            action: "round.resolved",
            entity: "RoundInstance",
            entityId: round.id,
            newData: {
              resolverId: output.resolverId,
              inputHash,
              outputHash,
              qualifiedIds: output.qualifiedIds,
              eliminatedIds: output.eliminatedIds,
            },
          },
        });

        return {
          type: "ok" as const,
          resolutionLog,
          output,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function replayRound(roundId: string) {
  const resolutionLog = await prisma.resolutionLog.findUnique({
    where: { roundId },
  });
  if (!resolutionLog) return { type: "not-finalized" as const };

  const input = resolutionLog.inputSnapshot as unknown as ResolverInput;
  const output = resolveRound(input);
  const outputHash = hashResolution(output);
  const matched = outputHash === resolutionLog.outputHash;

  await prisma.$transaction([
    prisma.resolutionLog.update({
      where: { id: resolutionLog.id },
      data: { replayedAt: new Date() },
    }),
    prisma.gameEvent.create({
      data: {
        sessionId: resolutionLog.sessionId,
        roundId,
        eventType: "round.replay-requested",
        aggregateType: "RoundInstance",
        aggregateId: roundId,
        payload: {
          matched,
          expectedOutputHash: resolutionLog.outputHash,
          actualOutputHash: outputHash,
        },
      },
    }),
  ]);

  return {
    type: "ok" as const,
    matched,
    expectedOutputHash: resolutionLog.outputHash,
    actualOutputHash: outputHash,
    output,
  };
}
