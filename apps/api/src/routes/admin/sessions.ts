import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { randomBytes } from "node:crypto";
import { prisma, GameSessionStatus, Prisma } from "@session-jeu/db";
import {
  requireAuth,
  requireRole,
  getClientIp,
  getRequestId,
  getUserAgent,
} from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  adminSessionParamsSchema,
  calculateSessionFinancials,
  cancelSessionSchema,
  createAdminSessionSchema,
  generateSessionCode,
  sensitiveAdminSessionFields,
  updateAdminSessionSchema,
  versionedActionSchema,
} from "../../admin/sessionConfig.js";
import { checkInDeadlineFor } from "../../lobby/lobby.js";
import { scheduleCheckInDeadline } from "../../queues/checkInDeadline.js";
import { assertPublicSessionCompliance } from "../../security/security.js";
import { z } from "zod";
import {
  CAPACITY_REGISTRATION_STATUSES,
  PAID_ACCESS_REGISTRATION_STATUSES,
} from "../../sessions/statusGroups.js";

const adminSessions = new Hono<{ Variables: AuthVariables }>();

const adminOnly = [requireAuth, requireRole("ADMIN", "SUPER_ADMIN")] as const;

const adminRead = [requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT")] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "DRAFT",
      "PUBLISHED",
      "ACTIVE",
      "WAITING_START",
      "LIVE",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
});

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

function auditContext(c: Parameters<typeof getClientIp>[0]) {
  return {
    requestId: getRequestId(c),
    ipAddress: getClientIp(c),
    userAgent: getUserAgent(c),
  };
}

function parseWinnerSplitBps(value: unknown): number[] {
  if (!Array.isArray(value)) return [10000];
  const numbers = value.filter((item): item is number => Number.isInteger(item));
  return numbers.length > 0 ? numbers : [10000];
}

function serializeSession(session: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  entryFeeXaf: number;
  visibility: string;
  prizePoolBps: number;
  winnerSplitBps: unknown;
  providerFeeBps: number;
  configVersion: number;
  startTime: Date | null;
  registrationClosesAt: Date | null;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdBy: string;
}) {
  return {
    id: session.id,
    code: session.code,
    name: session.name,
    description: session.description,
    status: session.status,
    minPlayers: session.minPlayers,
    maxPlayers: session.maxPlayers,
    entryFeeXaf: session.entryFeeXaf,
    visibility: session.visibility,
    prizePoolBps: session.prizePoolBps,
    winnerSplitBps: parseWinnerSplitBps(session.winnerSplitBps),
    providerFeeBps: session.providerFeeBps,
    configVersion: session.configVersion,
    startsAt: session.startTime?.toISOString() ?? null,
    registrationClosesAt: session.registrationClosesAt?.toISOString() ?? null,
    publishedAt: session.publishedAt?.toISOString() ?? null,
    cancelledAt: session.cancelledAt?.toISOString() ?? null,
    cancellationReason: session.cancellationReason,
    createdBy: session.createdBy,
  };
}

function buildLegacyPrizePool(input: {
  maxPlayers: number;
  entryFeeXaf: number;
  providerFeeBps: number;
  prizePoolBps: number;
  winnerSplitBps: number[];
}) {
  return calculateSessionFinancials({
    paidRegistrationsCount: input.maxPlayers,
    minPlayers: input.maxPlayers,
    maxPlayers: input.maxPlayers,
    entryFeeXaf: input.entryFeeXaf,
    providerFeeBps: input.providerFeeBps,
    prizePoolBps: input.prizePoolBps,
    winnerSplitBps: input.winnerSplitBps,
  }).prizePoolXaf;
}

function hasSensitiveChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  patchKeys: Set<string>,
) {
  return sensitiveAdminSessionFields.some(
    (field) =>
      patchKeys.has(field) && JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
}

function validatePublishable(session: {
  minPlayers: number;
  maxPlayers: number;
  entryFeeXaf: number;
  prizePoolBps: number;
  providerFeeBps: number;
  winnerSplitBps: unknown;
  startTime: Date | null;
  registrationClosesAt: Date | null;
}) {
  const winnerSplitBps = parseWinnerSplitBps(session.winnerSplitBps);
  if (session.minPlayers < 2 || session.maxPlayers < session.minPlayers) {
    return "INVALID_CAPACITY";
  }
  if (session.entryFeeXaf < 100) {
    return "INVALID_ENTRY_FEE";
  }
  if (session.prizePoolBps < 0 || session.prizePoolBps > 10000 || session.providerFeeBps > 10000) {
    return "INVALID_BPS";
  }
  if (winnerSplitBps.reduce((total, split) => total + split, 0) !== 10000) {
    return "INVALID_PRIZE_SPLIT";
  }
  if (!session.startTime || session.startTime <= new Date()) {
    return "INVALID_START_TIME";
  }
  if (session.registrationClosesAt && session.registrationClosesAt > session.startTime) {
    return "INVALID_REGISTRATION_CLOSE";
  }
  return null;
}

adminSessions.post(
  "/",
  ...adminOnly,
  zValidator("json", createAdminSessionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const code =
      input.code ?? generateSessionCode(input.name, randomBytes(3).toString("hex").toUpperCase());
    const prizePool = buildLegacyPrizePool({
      maxPlayers: input.maxPlayers,
      entryFeeXaf: input.entryFeeXaf,
      providerFeeBps: input.providerFeeBps,
      prizePoolBps: input.prizePoolBps,
      winnerSplitBps: input.winnerSplitBps,
    });

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.gameSession.create({
        data: {
          code,
          name: input.name,
          description: input.description,
          status: GameSessionStatus.DRAFT,
          minPlayers: input.minPlayers,
          maxPlayers: input.maxPlayers,
          entryFee: input.entryFeeXaf,
          entryFeeXaf: input.entryFeeXaf,
          visibility: input.visibility,
          prizePool,
          prizePoolBps: input.prizePoolBps,
          winnerSplitBps: input.winnerSplitBps,
          providerFeeBps: input.providerFeeBps,
          startTime: input.startsAt ? new Date(input.startsAt) : null,
          registrationClosesAt: input.registrationClosesAt
            ? new Date(input.registrationClosesAt)
            : null,
          createdBy: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "session.draft-created",
          entity: "GameSession",
          entityId: created.id,
          reason: input.reason,
          newData: serializeSession(created),
          ...auditContext(c),
        },
      });

      return created;
    });

    return successResponse(c, { session: serializeSession(session) }, 201);
  },
);

adminSessions.get(
  "/",
  ...adminRead,
  zValidator("query", listQuerySchema, validationHook),
  async (c) => {
    const { page, limit, status } = c.req.valid("query");
    const skip = (page - 1) * limit;

    const where: Prisma.GameSessionWhereInput = {};
    if (status) where.status = status as GameSessionStatus;

    const [total, sessions] = await Promise.all([
      prisma.gameSession.count({ where }),
      prisma.gameSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              registrations: {
                where: { status: { in: [...CAPACITY_REGISTRATION_STATUSES] } },
              },
            },
          },
        },
      }),
    ]);

    const data = sessions.map((s) => ({
      ...serializeSession(s),
      paidRegistrationsCount: s._count.registrations,
    }));

    return successResponse(c, {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

adminSessions.get(
  "/:id",
  ...adminRead,
  zValidator("param", adminSessionParamsSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                profile: { select: { username: true, avatarUrl: true } },
              },
            },
            payment: { select: { id: true, status: true, amountXaf: true, providerTransId: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        rounds: {
          orderBy: { roundNum: "asc" },
          include: { miniGameDefinition: { select: { id: true, name: true } } },
        },
        liveState: true,
        gameResults: { orderBy: { finalRank: "asc" } },
        commissionRecord: true,
        disputeWindow: true,
      },
    });
    if (!session) {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }

    return successResponse(c, {
      session: {
        ...serializeSession(session),
        registrations: session.registrations.map((r) => ({
          id: r.id,
          status: r.status,
          user: r.user,
          payment: r.payment,
          checkedInAt: r.checkedInAt?.toISOString() ?? null,
          inRoomAt: r.inRoomAt?.toISOString() ?? null,
          noShowAt: r.noShowAt?.toISOString() ?? null,
          cancelledAt: r.cancelledAt?.toISOString() ?? null,
        })),
        rounds: session.rounds.map((r) => ({
          id: r.id,
          order: r.roundNum,
          miniGameId: r.miniGameDefinitionId ?? "",
          miniGameName: r.miniGameDefinition?.name ?? "Mini-jeu",
          configJson: r.configJson,
          durationMs:
            r.startTime && r.endTime ? r.endTime.getTime() - r.startTime.getTime() : 0,
          policy: null,
        })),
        liveState: session.liveState
          ? {
              id: session.liveState.id,
              sessionId: session.liveState.sessionId,
              phase: session.liveState.phase,
              previousPhase: session.liveState.previousPhase,
              currentRoundId: session.liveState.currentRoundId,
              phaseStartedAt: session.liveState.phaseStartedAt?.toISOString() ?? null,
              pausedAt: session.liveState.pausedAt?.toISOString() ?? null,
              pauseReason: session.liveState.pauseReason,
            }
          : null,
        results: session.gameResults.map((r) => ({
          id: r.id,
          userId: r.userId,
          finalRank: r.finalRank,
          finalStatus: r.finalStatus,
          prizeWonXaf: r.prizeWonXaf,
        })),
        commissionRecord: session.commissionRecord
          ? {
              id: session.commissionRecord.id,
              sessionId: session.commissionRecord.sessionId,
              grossCollectionXaf: session.commissionRecord.grossCollectionXaf,
              providerFeesXaf: session.commissionRecord.providerFeesXaf,
              netCollectionXaf: session.commissionRecord.netCollectionXaf,
              prizePoolXaf: session.commissionRecord.prizePoolXaf,
              organizationCommissionXaf: session.commissionRecord.organizationCommissionXaf,
              roundingRemainderXaf: session.commissionRecord.roundingRemainderXaf,
              createdAt: session.commissionRecord.createdAt.toISOString(),
            }
          : null,
        disputeWindow: session.disputeWindow
          ? {
              id: session.disputeWindow.id,
              status: session.disputeWindow.status,
              reason: session.disputeWindow.requestReason,
              requestedById: session.disputeWindow.requestedById,
              requestedAt: session.disputeWindow.requestedAt?.toISOString() ?? null,
            }
          : null,
      },
    });
  },
);

adminSessions.get(
  "/:id/simulation",
  ...adminOnly,
  zValidator("param", adminSessionParamsSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const session = await prisma.gameSession.findUnique({ where: { id } });
    if (!session) {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }

    const paidRegistrationsCount = await prisma.sessionRegistration.count({
      where: {
        sessionId: id,
        status: { in: [...PAID_ACCESS_REGISTRATION_STATUSES] },
      },
    });

    return successResponse(c, {
      simulation: calculateSessionFinancials({
        paidRegistrationsCount,
        minPlayers: session.minPlayers,
        maxPlayers: session.maxPlayers,
        entryFeeXaf: session.entryFeeXaf,
        providerFeeBps: session.providerFeeBps,
        prizePoolBps: session.prizePoolBps,
        winnerSplitBps: parseWinnerSplitBps(session.winnerSplitBps),
      }),
    });
  },
);

adminSessions.patch(
  "/:id",
  ...adminOnly,
  zValidator("param", adminSessionParamsSchema, validationHook),
  zValidator("json", updateAdminSessionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameSession.findUnique({ where: { id } });
      if (!existing) return { type: "not-found" as const };

      const paidRegistrationsCount = await tx.sessionRegistration.count({
      where: { sessionId: id, status: { in: [...PAID_ACCESS_REGISTRATION_STATUSES] } },
    });

      const before = serializeSession(existing);
      const merged = {
        name: input.name ?? existing.name,
        description: input.description === undefined ? existing.description : input.description,
        minPlayers: input.minPlayers ?? existing.minPlayers,
        maxPlayers: input.maxPlayers ?? existing.maxPlayers,
        entryFeeXaf: input.entryFeeXaf ?? existing.entryFeeXaf,
        visibility: input.visibility ?? existing.visibility,
        prizePoolBps: input.prizePoolBps ?? existing.prizePoolBps,
        winnerSplitBps: input.winnerSplitBps ?? parseWinnerSplitBps(existing.winnerSplitBps),
        providerFeeBps: input.providerFeeBps ?? existing.providerFeeBps,
        startTime:
          input.startsAt === undefined
            ? existing.startTime
            : input.startsAt === null
              ? null
              : new Date(input.startsAt),
        registrationClosesAt:
          input.registrationClosesAt === undefined
            ? existing.registrationClosesAt
            : input.registrationClosesAt === null
              ? null
              : new Date(input.registrationClosesAt),
      };

      const after = {
        ...before,
        ...merged,
        startsAt: merged.startTime?.toISOString() ?? null,
        registrationClosesAt: merged.registrationClosesAt?.toISOString() ?? null,
      };

      if (
        paidRegistrationsCount > 0 &&
        hasSensitiveChange(before, after, new Set(Object.keys(input)))
      ) {
        return { type: "paid-lock" as const };
      }

      const publishError = validatePublishable({
        minPlayers: merged.minPlayers,
        maxPlayers: merged.maxPlayers,
        entryFeeXaf: merged.entryFeeXaf,
        prizePoolBps: merged.prizePoolBps,
        providerFeeBps: merged.providerFeeBps,
        winnerSplitBps: merged.winnerSplitBps,
        startTime: merged.startTime,
        registrationClosesAt: merged.registrationClosesAt,
      });
      if (publishError && existing.status !== GameSessionStatus.DRAFT) {
        return { type: "invalid" as const, code: publishError };
      }

      const updatedCount = await tx.gameSession.updateMany({
        where: {
          id,
          configVersion: input.expectedConfigVersion,
        },
        data: {
          name: merged.name,
          description: merged.description,
          minPlayers: merged.minPlayers,
          maxPlayers: merged.maxPlayers,
          entryFee: merged.entryFeeXaf,
          entryFeeXaf: merged.entryFeeXaf,
          visibility: merged.visibility,
          prizePool: buildLegacyPrizePool({
            maxPlayers: merged.maxPlayers,
            entryFeeXaf: merged.entryFeeXaf,
            providerFeeBps: merged.providerFeeBps,
            prizePoolBps: merged.prizePoolBps,
            winnerSplitBps: merged.winnerSplitBps,
          }),
          prizePoolBps: merged.prizePoolBps,
          winnerSplitBps: merged.winnerSplitBps,
          providerFeeBps: merged.providerFeeBps,
          startTime: merged.startTime,
          registrationClosesAt: merged.registrationClosesAt,
          configVersion: { increment: 1 },
        },
      });

      if (updatedCount.count !== 1) return { type: "conflict" as const };
      const updated = await tx.gameSession.findUniqueOrThrow({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "session.config-updated",
          entity: "GameSession",
          entityId: id,
          reason: input.reason,
          oldData: before,
          newData: serializeSession(updated),
          ...auditContext(c),
        },
      });

      return { type: "ok" as const, session: updated };
    });

    if (result.type === "not-found")
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    if (result.type === "paid-lock") {
      return errorResponse(c, 409, "PAID_REGISTRATIONS_EXIST", "Sensitive config is locked");
    }
    if (result.type === "conflict") {
      return errorResponse(c, 409, "CONFIG_VERSION_CONFLICT", "Session config version conflict");
    }
    if (result.type === "invalid") {
      return errorResponse(c, 400, result.code, "Session config is invalid");
    }

    const checkInDeadlineAt = checkInDeadlineFor(result.session);
    if (checkInDeadlineAt) {
      await scheduleCheckInDeadline({ sessionId: result.session.id, checkInDeadlineAt });
    }

    return successResponse(c, { session: serializeSession(result.session) });
  },
);

adminSessions.post(
  "/:id/publish",
  ...adminOnly,
  zValidator("param", adminSessionParamsSchema, validationHook),
  zValidator("json", versionedActionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameSession.findUnique({ where: { id } });
      if (!existing) return { type: "not-found" as const };
      const invalidCode = validatePublishable(existing);
      if (invalidCode) return { type: "invalid" as const, code: invalidCode };
      const compliance = await assertPublicSessionCompliance({ visibility: existing.visibility });
      if (compliance.type === "blocked") {
        return { type: "compliance-blocked" as const, gate: compliance.gate };
      }

      const updatedCount = await tx.gameSession.updateMany({
        where: { id, configVersion: input.expectedConfigVersion },
        data: {
          status: GameSessionStatus.PUBLISHED,
          publishedAt: new Date(),
          configVersion: { increment: 1 },
        },
      });
      if (updatedCount.count !== 1) return { type: "conflict" as const };
      const updated = await tx.gameSession.findUniqueOrThrow({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "session.published",
          entity: "GameSession",
          entityId: id,
          reason: input.reason,
          oldData: serializeSession(existing),
          newData: serializeSession(updated),
          ...auditContext(c),
        },
      });

      return { type: "ok" as const, session: updated };
    });

    if (result.type === "not-found")
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    if (result.type === "conflict") {
      return errorResponse(c, 409, "CONFIG_VERSION_CONFLICT", "Session config version conflict");
    }
    if (result.type === "invalid") {
      return errorResponse(c, 400, result.code, "Session config is invalid");
    }
    if (result.type === "compliance-blocked") {
      return errorResponse(
        c,
        403,
        "403_COMPLIANCE_GATE_BLOCKED",
        "Compliance gate blocks public session publication",
        { gateType: result.gate.type, scope: result.gate.scope },
      );
    }

    return successResponse(c, { session: serializeSession(result.session) });
  },
);

adminSessions.post(
  "/:id/open-registration",
  ...adminOnly,
  zValidator("param", adminSessionParamsSchema, validationHook),
  zValidator("json", versionedActionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameSession.findUnique({ where: { id } });
      if (!existing) return { type: "not-found" as const };
      if (existing.status !== GameSessionStatus.PUBLISHED)
        return { type: "invalid-status" as const };

      const updatedCount = await tx.gameSession.updateMany({
        where: { id, configVersion: input.expectedConfigVersion },
        data: {
          status: GameSessionStatus.ACTIVE,
          configVersion: { increment: 1 },
        },
      });
      if (updatedCount.count !== 1) return { type: "conflict" as const };
      const updated = await tx.gameSession.findUniqueOrThrow({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "session.registration-opened",
          entity: "GameSession",
          entityId: id,
          reason: input.reason,
          oldData: serializeSession(existing),
          newData: serializeSession(updated),
          ...auditContext(c),
        },
      });

      return { type: "ok" as const, session: updated };
    });

    if (result.type === "not-found")
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    if (result.type === "invalid-status") {
      return errorResponse(c, 409, "SESSION_NOT_PUBLISHED", "Session must be published first");
    }
    if (result.type === "conflict") {
      return errorResponse(c, 409, "CONFIG_VERSION_CONFLICT", "Session config version conflict");
    }

    return successResponse(c, { session: serializeSession(result.session) });
  },
);

adminSessions.post(
  "/:id/cancel",
  ...adminOnly,
  zValidator("param", adminSessionParamsSchema, validationHook),
  zValidator("json", cancelSessionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameSession.findUnique({ where: { id } });
      if (!existing) return { type: "not-found" as const };
      if (existing.status === GameSessionStatus.COMPLETED) return { type: "completed" as const };

      const updatedCount = await tx.gameSession.updateMany({
        where: { id, configVersion: input.expectedConfigVersion },
        data: {
          status: GameSessionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: input.reason,
          configVersion: { increment: 1 },
        },
      });
      if (updatedCount.count !== 1) return { type: "conflict" as const };
      const updated = await tx.gameSession.findUniqueOrThrow({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "session.cancelled",
          entity: "GameSession",
          entityId: id,
          reason: input.reason,
          oldData: serializeSession(existing),
          newData: serializeSession(updated),
          ...auditContext(c),
        },
      });

      return { type: "ok" as const, session: updated };
    });

    if (result.type === "not-found")
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    if (result.type === "completed") {
      return errorResponse(
        c,
        409,
        "SESSION_ALREADY_COMPLETED",
        "Completed sessions cannot be cancelled",
      );
    }
    if (result.type === "conflict") {
      return errorResponse(c, 409, "CONFIG_VERSION_CONFLICT", "Session config version conflict");
    }

    return successResponse(c, { session: serializeSession(result.session) });
  },
);

export default adminSessions;
