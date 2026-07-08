import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { GameSessionStatus, Prisma, prisma, SessionRegistrationStatus } from "@session-jeu/db";
import { withSerializableRetry } from "../registrations/sessionRegistration.js";
import { markLobbyPresence } from "./presence.js";

export const CHECK_IN_GRACE_MS = 5 * 60 * 1000;
export const JOIN_TOKEN_TTL_MS = 2 * 60 * 1000;

export const sessionIdParamsSchema = z.object({
  id: z.string().min(1),
});

type RegistrationRecord = {
  id: string;
  userId: string;
  sessionId: string;
  status: string;
  paymentDeadlineAt: Date | null;
  paidAt: Date | null;
  checkedInAt: Date | null;
  inRoomAt: Date | null;
  noShowAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  startTime: Date | null;
  registrationClosesAt: Date | null;
  cancelledAt: Date | null;
};

type JoinTokenRecord = {
  id: string;
  userId: string;
  sessionId: string;
  registrationId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export function checkInDeadlineFor(session: Pick<SessionRecord, "startTime">) {
  if (!session.startTime) return null;
  return new Date(session.startTime.getTime() + CHECK_IN_GRACE_MS);
}

function hashJoinToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function createJoinTokenValue() {
  return randomBytes(32).toString("base64url");
}

export function serializeLobbyRegistration(registration: RegistrationRecord) {
  return {
    id: registration.id,
    userId: registration.userId,
    sessionId: registration.sessionId,
    status: registration.status,
    paymentDeadlineAt: registration.paymentDeadlineAt?.toISOString() ?? null,
    paidAt: registration.paidAt?.toISOString() ?? null,
    checkedInAt: registration.checkedInAt?.toISOString() ?? null,
    inRoomAt: registration.inRoomAt?.toISOString() ?? null,
    noShowAt: registration.noShowAt?.toISOString() ?? null,
    cancelledAt: registration.cancelledAt?.toISOString() ?? null,
    cancellationReason: registration.cancellationReason,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
  };
}

export function serializeLobbySession(session: SessionRecord) {
  const checkInDeadlineAt = checkInDeadlineFor(session);
  return {
    id: session.id,
    code: session.code,
    name: session.name,
    description: session.description,
    status: session.status,
    minPlayers: session.minPlayers,
    maxPlayers: session.maxPlayers,
    startTime: session.startTime?.toISOString() ?? null,
    registrationClosesAt: session.registrationClosesAt?.toISOString() ?? null,
    cancelledAt: session.cancelledAt?.toISOString() ?? null,
    checkInDeadlineAt: checkInDeadlineAt?.toISOString() ?? null,
    checkInGraceSeconds: Math.floor(CHECK_IN_GRACE_MS / 1000),
    noShowPolicy:
      "Players who do not check in before the deadline can be marked no-show before live start.",
    criticalRules: [
      "Check in before the deadline.",
      "Only checked-in players can request a live join token.",
      "Join tokens are short-lived and single-use.",
    ],
  };
}

export function serializeJoinToken(record: JoinTokenRecord, token: string) {
  return {
    token,
    tokenId: record.id,
    sessionId: record.sessionId,
    registrationId: record.registrationId,
    expiresAt: record.expiresAt.toISOString(),
  };
}

async function findPlayerRegistration(input: { userId: string; sessionId: string }) {
  return prisma.sessionRegistration.findFirst({
    where: {
      userId: input.userId,
      sessionId: input.sessionId,
      status: {
        in: [
          SessionRegistrationStatus.PAID,
          SessionRegistrationStatus.CHECKED_IN,
          SessionRegistrationStatus.IN_ROOM,
        ],
      },
    },
    include: {
      session: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          status: true,
          minPlayers: true,
          maxPlayers: true,
          startTime: true,
          registrationClosesAt: true,
          cancelledAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLobbyForPlayer(input: { userId: string; sessionId: string }) {
  const registration = await findPlayerRegistration(input);
  if (!registration) return { type: "not-paid" as const };
  if (registration.session.status === GameSessionStatus.CANCELLED) {
    return { type: "session-cancelled" as const };
  }

  const presence = await markLobbyPresence(input);
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "lobby.joined",
      entity: "GameSession",
      entityId: input.sessionId,
      newData: { presence },
    },
  });

  return {
    type: "ok" as const,
    session: registration.session,
    registration,
    presence,
  };
}

export async function checkInPlayer(input: { userId: string; sessionId: string; now?: Date }) {
  const now = input.now ?? new Date();
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const registration = await tx.sessionRegistration.findFirst({
          where: {
            userId: input.userId,
            sessionId: input.sessionId,
            status: {
              in: [SessionRegistrationStatus.PAID, SessionRegistrationStatus.CHECKED_IN],
            },
          },
          include: {
            session: {
              select: {
                id: true,
                status: true,
                startTime: true,
                cancelledAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!registration) return { type: "not-paid" as const };
        if (registration.session.status === GameSessionStatus.CANCELLED) {
          return { type: "session-cancelled" as const };
        }

        const checkInDeadlineAt = checkInDeadlineFor(registration.session);
        if (checkInDeadlineAt && checkInDeadlineAt <= now) {
          return { type: "checkin-closed" as const, checkInDeadlineAt };
        }

        if (registration.status === SessionRegistrationStatus.CHECKED_IN) {
          return { type: "idempotent" as const, registration, checkInDeadlineAt };
        }

        const updated = await tx.sessionRegistration.update({
          where: { id: registration.id },
          data: {
            status: SessionRegistrationStatus.CHECKED_IN,
            checkedInAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.userId,
            action: "player.checked-in",
            entity: "SessionRegistration",
            entityId: registration.id,
            oldData: serializeLobbyRegistration(registration),
            newData: serializeLobbyRegistration(updated),
          },
        });

        return { type: "ok" as const, registration: updated, checkInDeadlineAt };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function authorizeSessionStart(input: {
  adminUserId: string;
  sessionId: string;
  now?: Date;
}) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          select: {
            id: true,
            status: true,
            minPlayers: true,
          },
        });

        if (!session) return { type: "not-found" as const };
        if (session.status === GameSessionStatus.CANCELLED) {
          return { type: "session-cancelled" as const };
        }
        if (
          session.status !== GameSessionStatus.ACTIVE &&
          session.status !== GameSessionStatus.WAITING_START
        ) {
          return { type: "not-startable" as const };
        }

        const checkedInCount = await tx.sessionRegistration.count({
          where: {
            sessionId: input.sessionId,
            status: SessionRegistrationStatus.CHECKED_IN,
          },
        });

        if (checkedInCount < session.minPlayers) {
          return {
            type: "min-not-reached" as const,
            checkedInCount,
            minPlayers: session.minPlayers,
          };
        }

        const updated = await tx.gameSession.update({
          where: { id: session.id },
          data: {
            status: GameSessionStatus.LIVE,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "session.start-authorized",
            entity: "GameSession",
            entityId: session.id,
            oldData: session,
            newData: { status: updated.status, checkedInCount },
          },
        });

        return { type: "ok" as const, session: updated, checkedInCount };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function issueJoinToken(input: { userId: string; sessionId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const registration = await prisma.sessionRegistration.findFirst({
    where: {
      userId: input.userId,
      sessionId: input.sessionId,
      status: SessionRegistrationStatus.CHECKED_IN,
    },
    include: {
      session: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!registration) return { type: "not-checked-in" as const };
  if (registration.session.status === GameSessionStatus.CANCELLED) {
    return { type: "session-cancelled" as const };
  }

  const token = createJoinTokenValue();
  const record = await prisma.joinToken.create({
    data: {
      tokenHash: hashJoinToken(token),
      userId: input.userId,
      sessionId: input.sessionId,
      registrationId: registration.id,
      expiresAt: new Date(now.getTime() + JOIN_TOKEN_TTL_MS),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "join-token.issued",
      entity: "JoinToken",
      entityId: record.id,
      newData: {
        sessionId: input.sessionId,
        registrationId: registration.id,
        expiresAt: record.expiresAt.toISOString(),
      },
    },
  });

  return { type: "ok" as const, token, record };
}

export async function consumeJoinToken(input: { token: string; now?: Date }) {
  const now = input.now ?? new Date();
  const tokenHash = hashJoinToken(input.token);

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const record = await tx.joinToken.findUnique({
          where: { tokenHash },
        });

        if (!record) return { type: "not-found" as const };
        if (record.expiresAt <= now) return { type: "expired" as const };
        if (record.consumedAt) return { type: "used" as const };

        const consumed = await tx.joinToken.update({
          where: { id: record.id },
          data: { consumedAt: now },
        });

        await tx.sessionRegistration.updateMany({
          where: {
            id: record.registrationId,
            status: SessionRegistrationStatus.CHECKED_IN,
          },
          data: {
            status: SessionRegistrationStatus.IN_ROOM,
            inRoomAt: now,
          },
        });

        return { type: "ok" as const, token: consumed };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}
