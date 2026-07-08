import { createHash } from "node:crypto";
import {
  GameSessionStatus,
  LivePhase,
  PlayerConnectionStatus,
  Prisma,
  prisma,
  RoundStatus,
  SessionRegistrationStatus,
} from "@session-jeu/db";
import { scheduleRoundDeadline } from "./roundDeadlineQueue.js";

export const RECONNECT_WINDOW_SECONDS = 30;
export const DEFAULT_ROUND_DURATION_MS = 30 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export type LiveAuth = {
  userId: string;
  registrationId: string;
};

export async function consumeLiveReservation(input: {
  sessionId: string;
  reservationToken: string;
  roomId: string;
  colyseusSessionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const tokenHash = hashToken(input.reservationToken);

  return prisma.$transaction(
    async (tx) => {
      const reservation = await tx.liveReservation.findUnique({
        where: { tokenHash },
      });

      if (!reservation || reservation.sessionId !== input.sessionId) {
        return { type: "invalid-reservation" as const };
      }
      if (reservation.expiresAt <= now) return { type: "expired-reservation" as const };
      if (reservation.consumedAt) return { type: "used-reservation" as const };

      const session = await tx.gameSession.findUnique({
        where: { id: input.sessionId },
        select: { id: true, status: true },
      });
      if (!session || session.status !== GameSessionStatus.LIVE) {
        return { type: "session-not-live" as const };
      }

      await tx.liveReservation.update({
        where: { id: reservation.id },
        data: { consumedAt: now },
      });

      await tx.playerConnection.upsert({
        where: {
          sessionId_userId: {
            sessionId: input.sessionId,
            userId: reservation.userId,
          },
        },
        create: {
          sessionId: input.sessionId,
          userId: reservation.userId,
          registrationId: reservation.registrationId,
          roomId: input.roomId,
          colyseusSessionId: input.colyseusSessionId,
          status: PlayerConnectionStatus.CONNECTED,
          connectedAt: now,
          lastSeenAt: now,
        },
        update: {
          registrationId: reservation.registrationId,
          roomId: input.roomId,
          colyseusSessionId: input.colyseusSessionId,
          status: PlayerConnectionStatus.CONNECTED,
          connectedAt: now,
          disconnectedAt: null,
          reconnectUntil: null,
          lastSeenAt: now,
        },
      });

      await tx.liveSessionState.upsert({
        where: { sessionId: input.sessionId },
        create: {
          sessionId: input.sessionId,
          roomId: input.roomId,
          phase: LivePhase.BRIEFING,
          phaseStartedAt: now,
        },
        update: {
          roomId: input.roomId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: reservation.userId,
          action: "player.connected",
          entity: "GameSession",
          entityId: input.sessionId,
          newData: {
            roomId: input.roomId,
            colyseusSessionId: input.colyseusSessionId,
          },
        },
      });

      return {
        type: "ok" as const,
        auth: {
          userId: reservation.userId,
          registrationId: reservation.registrationId,
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function loadInitialLiveState(input: { sessionId: string; roomId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const session = await prisma.gameSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, minPlayers: true, maxPlayers: true, name: true },
  });

  if (!session || session.status !== GameSessionStatus.LIVE) {
    return { type: "session-not-live" as const };
  }

  const players = await prisma.sessionRegistration.findMany({
    where: {
      sessionId: input.sessionId,
      status: { in: [SessionRegistrationStatus.CHECKED_IN, SessionRegistrationStatus.IN_ROOM] },
    },
    select: {
      userId: true,
      user: { select: { name: true, profile: { select: { username: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const liveState = await prisma.liveSessionState.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      roomId: input.roomId,
      phase: LivePhase.BRIEFING,
      phaseStartedAt: now,
    },
    update: { roomId: input.roomId },
  });

  return { type: "ok" as const, session, players, liveState };
}

export async function startRound(input: {
  sessionId: string;
  roundNum: number;
  durationMs?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const durationMs = input.durationMs ?? DEFAULT_ROUND_DURATION_MS;
  const deadlineAt = new Date(now.getTime() + durationMs);

  const result = await prisma.$transaction(
    async (tx) => {
      const round = await tx.roundInstance.upsert({
        where: {
          sessionId_roundNum: {
            sessionId: input.sessionId,
            roundNum: input.roundNum,
          },
        },
        create: {
          sessionId: input.sessionId,
          roundNum: input.roundNum,
          status: RoundStatus.ACTIVE,
          startTime: now,
        },
        update: {
          status: RoundStatus.ACTIVE,
          startTime: now,
          endTime: null,
        },
      });

      const deadline = await tx.roundDeadline.upsert({
        where: { roundId: round.id },
        create: {
          sessionId: input.sessionId,
          roundId: round.id,
          deadlineAt,
        },
        update: {
          deadlineAt,
          closedAt: null,
        },
      });

      const liveState = await tx.liveSessionState.upsert({
        where: { sessionId: input.sessionId },
        create: {
          sessionId: input.sessionId,
          phase: LivePhase.ROUND_ACTIVE,
          currentRoundId: round.id,
          phaseStartedAt: now,
        },
        update: {
          phase: LivePhase.ROUND_ACTIVE,
          currentRoundId: round.id,
          phaseStartedAt: now,
          pausedAt: null,
          pauseReason: null,
        },
      });

      await tx.auditLog.createMany({
        data: [
          {
            action: "round.started",
            entity: "RoundInstance",
            entityId: round.id,
            newData: { sessionId: input.sessionId, roundNum: input.roundNum },
          },
          {
            action: "round.deadline-set",
            entity: "RoundDeadline",
            entityId: deadline.id,
            newData: {
              sessionId: input.sessionId,
              roundId: round.id,
              deadlineAt: deadlineAt.toISOString(),
            },
          },
        ],
      });

      return { round, deadline, liveState };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );

  await scheduleRoundDeadline({
    sessionId: input.sessionId,
    roundId: result.round.id,
    deadlineAt,
  });

  return result;
}

export async function submitPlayerAction(input: {
  sessionId: string;
  userId: string;
  actionNonce: string;
  actionType: string;
  payload: Prisma.InputJsonObject;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return prisma.$transaction(
    async (tx) => {
      const liveState = await tx.liveSessionState.findUnique({
        where: { sessionId: input.sessionId },
      });
      if (!liveState?.currentRoundId) return { type: "no-active-round" as const };
      if (liveState.phase === LivePhase.PAUSED) return { type: "paused" as const };
      if (liveState.phase !== LivePhase.ROUND_ACTIVE) {
        return { type: "round-not-active" as const };
      }

      const duplicate = await tx.playerAction.findUnique({
        where: {
          roundId_userId_actionNonce: {
            roundId: liveState.currentRoundId,
            userId: input.userId,
            actionNonce: input.actionNonce,
          },
        },
      });
      if (duplicate) return { type: "duplicate" as const, action: duplicate };

      const deadline = await tx.roundDeadline.findUnique({
        where: { roundId: liveState.currentRoundId },
      });
      if (!deadline || deadline.closedAt || deadline.deadlineAt <= now) {
        const action = await tx.playerAction.create({
          data: {
            sessionId: input.sessionId,
            roundId: liveState.currentRoundId,
            userId: input.userId,
            actionNonce: input.actionNonce,
            actionType: input.actionType,
            payload: input.payload,
            rejectedAt: now,
            rejectionReason: "deadline-closed",
          },
        });
        return { type: "late" as const, action };
      }

      const action = await tx.playerAction.create({
        data: {
          sessionId: input.sessionId,
          roundId: liveState.currentRoundId,
          userId: input.userId,
          actionNonce: input.actionNonce,
          actionType: input.actionType,
          payload: input.payload,
          acceptedAt: now,
        },
      });

      return { type: "accepted" as const, action, deadline };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function markPlayerDisconnected(input: {
  sessionId: string;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const reconnectUntil = new Date(now.getTime() + RECONNECT_WINDOW_SECONDS * 1000);
  await prisma.playerConnection.updateMany({
    where: { sessionId: input.sessionId, userId: input.userId },
    data: {
      status: PlayerConnectionStatus.RECONNECTING,
      disconnectedAt: now,
      reconnectUntil,
      lastSeenAt: now,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "player.disconnected",
      entity: "GameSession",
      entityId: input.sessionId,
      newData: { reconnectUntil: reconnectUntil.toISOString() },
    },
  });
  return { reconnectUntil };
}

export async function markPlayerReconnected(input: {
  sessionId: string;
  userId: string;
  colyseusSessionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  await prisma.playerConnection.updateMany({
    where: { sessionId: input.sessionId, userId: input.userId },
    data: {
      status: PlayerConnectionStatus.CONNECTED,
      colyseusSessionId: input.colyseusSessionId,
      disconnectedAt: null,
      reconnectUntil: null,
      lastSeenAt: now,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "player.reconnected",
      entity: "GameSession",
      entityId: input.sessionId,
      newData: { colyseusSessionId: input.colyseusSessionId },
    },
  });
}
