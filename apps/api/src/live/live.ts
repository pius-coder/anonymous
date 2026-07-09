import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  GameSessionStatus,
  LivePhase,
  Prisma,
  prisma,
  SessionRegistrationStatus,
} from "@session-jeu/db";
import { withSerializableRetry } from "../registrations/sessionRegistration.js";

export const LIVE_RESERVATION_TTL_MS = 60 * 1000;

export const liveSessionParamsSchema = z.object({
  id: z.string().min(1),
});

export const adminLiveSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const liveReservationBodySchema = z.object({
  joinToken: z.string().min(16),
});

export const livePauseBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

export function getGameWsEndpoint() {
  return process.env.GAME_WS_URL || "ws://localhost:2567";
}

export function serializeLiveSessionState(state: {
  id: string;
  sessionId: string;
  roomId: string | null;
  phase: string;
  previousPhase: string | null;
  currentRoundId: string | null;
  phaseStartedAt: Date | null;
  pausedAt: Date | null;
  pauseReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: state.id,
    sessionId: state.sessionId,
    roomId: state.roomId,
    phase: state.phase,
    previousPhase: state.previousPhase,
    currentRoundId: state.currentRoundId,
    phaseStartedAt: state.phaseStartedAt?.toISOString() ?? null,
    pausedAt: state.pausedAt?.toISOString() ?? null,
    pauseReason: state.pauseReason,
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

export async function createLiveReservation(input: {
  userId: string;
  sessionId: string;
  joinToken: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const liveToken = createToken();
  const liveTokenHash = hashToken(liveToken);
  const joinTokenHash = hashToken(input.joinToken);

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const joinToken = await tx.joinToken.findUnique({
          where: { tokenHash: joinTokenHash },
        });

        if (
          !joinToken ||
          joinToken.userId !== input.userId ||
          joinToken.sessionId !== input.sessionId
        ) {
          return { type: "invalid-join-token" as const };
        }
        if (joinToken.expiresAt <= now) return { type: "expired-join-token" as const };
        if (joinToken.consumedAt) return { type: "used-join-token" as const };

        const registration = await tx.sessionRegistration.findFirst({
          where: {
            id: joinToken.registrationId,
            userId: input.userId,
            sessionId: input.sessionId,
            status: {
              in: [SessionRegistrationStatus.CHECKED_IN, SessionRegistrationStatus.IN_ROOM],
            },
          },
          include: {
            session: {
              select: {
                id: true,
                status: true,
                maxPlayers: true,
                cancelledAt: true,
              },
            },
          },
        });

        if (!registration) return { type: "not-checked-in" as const };
        if (
          registration.session.cancelledAt ||
          registration.session.status === GameSessionStatus.CANCELLED
        ) {
          return { type: "session-cancelled" as const };
        }
        if (registration.session.status !== GameSessionStatus.LIVE) {
          return { type: "session-not-live" as const };
        }

        const consumedJoinToken = await tx.joinToken.update({
          where: { id: joinToken.id },
          data: { consumedAt: now },
        });

        await tx.sessionRegistration.update({
          where: { id: registration.id },
          data: {
            status: SessionRegistrationStatus.IN_ROOM,
            inRoomAt: now,
          },
        });

        const liveState = await tx.liveSessionState.upsert({
          where: { sessionId: input.sessionId },
          create: {
            sessionId: input.sessionId,
            phase: LivePhase.BRIEFING,
            phaseStartedAt: now,
          },
          update: {},
        });

        const reservation = await tx.liveReservation.create({
          data: {
            tokenHash: liveTokenHash,
            userId: input.userId,
            sessionId: input.sessionId,
            registrationId: registration.id,
            expiresAt: new Date(now.getTime() + LIVE_RESERVATION_TTL_MS),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.userId,
            action: "live.reservation-created",
            entity: "LiveReservation",
            entityId: reservation.id,
            newData: {
              sessionId: input.sessionId,
              registrationId: registration.id,
              joinTokenId: consumedJoinToken.id,
              expiresAt: reservation.expiresAt.toISOString(),
            },
          },
        });

        return {
          type: "ok" as const,
          reservation,
          liveToken,
          liveState,
          session: registration.session,
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

export async function getLiveStateForPlayer(input: { userId: string; sessionId: string }) {
  const registration = await prisma.sessionRegistration.findFirst({
    where: {
      userId: input.userId,
      sessionId: input.sessionId,
      status: {
        in: [SessionRegistrationStatus.CHECKED_IN, SessionRegistrationStatus.IN_ROOM],
      },
    },
    select: { id: true },
  });

  if (!registration) return { type: "not-checked-in" as const };

  const liveState = await prisma.liveSessionState.findUnique({
    where: { sessionId: input.sessionId },
    include: {
      currentRound: {
        select: { id: true, roundNum: true, status: true, startTime: true, endTime: true },
      },
    },
  });

  if (!liveState) return { type: "not-live" as const };

  const deadline = liveState.currentRoundId
    ? await prisma.roundDeadline.findUnique({
        where: { roundId: liveState.currentRoundId },
        select: { deadlineAt: true, closedAt: true },
      })
    : null;

  const players = await prisma.playerConnection.findMany({
    where: { sessionId: input.sessionId },
    select: {
      userId: true,
      status: true,
      lastSeenAt: true,
      disconnectedAt: true,
      reconnectUntil: true,
    },
    orderBy: { userId: "asc" },
  });

  return { type: "ok" as const, liveState, deadline, players };
}

export async function pauseLiveSession(input: {
  adminUserId: string;
  sessionId: string;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          select: { id: true, status: true },
        });
        if (!session) return { type: "not-found" as const };
        if (session.status !== GameSessionStatus.LIVE) return { type: "session-not-live" as const };

        const existing = await tx.liveSessionState.findUnique({
          where: { sessionId: input.sessionId },
        });
        if (existing?.phase === LivePhase.PAUSED) {
          return { type: "idempotent" as const, liveState: existing };
        }

        const liveState = await tx.liveSessionState.upsert({
          where: { sessionId: input.sessionId },
          create: {
            sessionId: input.sessionId,
            phase: LivePhase.PAUSED,
            previousPhase: LivePhase.BRIEFING,
            pausedAt: now,
            pauseReason: input.reason,
            phaseStartedAt: now,
          },
          update: {
            phase: LivePhase.PAUSED,
            previousPhase: existing?.phase ?? LivePhase.BRIEFING,
            pausedAt: now,
            pauseReason: input.reason,
            phaseStartedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "session.paused",
            entity: "GameSession",
            entityId: input.sessionId,
            oldData: existing ?? undefined,
            newData: liveState,
            reason: input.reason,
          },
        });

        return { type: "ok" as const, liveState };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function resumeLiveSession(input: {
  adminUserId: string;
  sessionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const liveState = await tx.liveSessionState.findUnique({
          where: { sessionId: input.sessionId },
        });
        if (!liveState) return { type: "not-live" as const };
        if (liveState.phase !== LivePhase.PAUSED) {
          return { type: "idempotent" as const, liveState };
        }

        const nextPhase = liveState.previousPhase ?? LivePhase.BRIEFING;
        const updated = await tx.liveSessionState.update({
          where: { id: liveState.id },
          data: {
            phase: nextPhase,
            previousPhase: null,
            pausedAt: null,
            pauseReason: null,
            phaseStartedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "session.resumed",
            entity: "GameSession",
            entityId: input.sessionId,
            oldData: liveState,
            newData: updated,
          },
        });

        return { type: "ok" as const, liveState: updated };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}
