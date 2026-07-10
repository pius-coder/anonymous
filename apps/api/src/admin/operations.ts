import { z } from "zod";
import {
  AdminActionApprovalStatus,
  GameSessionStatus,
  IncidentSeverity,
  PaymentStatus,
  Prisma,
  SessionRegistrationStatus,
  SupportCaseStatus,
  prisma,
} from "@session-jeu/db";
import type { Context } from "hono";
import { PAID_ACCESS_REGISTRATION_STATUSES } from "../sessions/statusGroups.js";
import {
  getClientIp,
  getRequestId,
  getUserAgent,
  type UserRoleValue,
} from "../auth/session.js";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
const OPERATIONS_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"] as const;
const SUPPORT_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"] as const;
const INCIDENT_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPPORT"] as const;

export const adminAuditLogsQuerySchema = z.object({
  actorId: z.string().min(1).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  entity: z.string().trim().min(1).max(120).optional(),
  entityId: z.string().trim().min(1).max(200).optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminUserParamsSchema = z.object({
  id: z.string().min(1),
});

export const adminUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["PLAYER", "SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminActionParamsSchema = z.object({
  id: z.string().min(1),
});

export const createIncidentSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  category: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  reason: z.string().trim().min(3).max(500),
});

export const createSupportCaseSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  reason: z.string().trim().min(3).max(500),
});

export const createAdminActionSchema = z.object({
  action: z.string().trim().min(3).max(120),
  entity: z.string().trim().min(2).max(120),
  entityId: z.string().trim().min(1).max(200).optional(),
  reason: z.string().trim().min(3).max(500),
  payload: z.record(z.string(), z.unknown()).optional(),
  beforeData: z.record(z.string(), z.unknown()).optional(),
  afterData: z.record(z.string(), z.unknown()).optional(),
});

export const approveAdminActionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export function hasAnyRole(role: UserRoleValue, allowed: readonly string[]) {
  return allowed.includes(role);
}

export function adminRoleMatrix(role: UserRoleValue) {
  return {
    canViewDashboard: hasAnyRole(role, OPERATIONS_ROLES),
    canViewAuditLogs: hasAnyRole(role, OPERATIONS_ROLES),
    canViewSupportUsers: hasAnyRole(role, SUPPORT_ROLES),
    canCreateIncidents: hasAnyRole(role, INCIDENT_ROLES),
    canRequestActions: hasAnyRole(role, ADMIN_ROLES),
    canApproveActions: role === "SUPER_ADMIN",
    canViewFinance: role === "FINANCE" || role === "ADMIN" || role === "SUPER_ADMIN",
    canViewGameplayControls: role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPPORT",
    canViewLedger: role === "FINANCE" || role === "ADMIN" || role === "SUPER_ADMIN",
  };
}

export function auditContext(c: Context) {
  return {
    requestId: getRequestId(c),
    ipAddress: getClientIp(c),
    userAgent: getUserAgent(c),
  };
}

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

function jsonObject(value: Record<string, unknown> | undefined) {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

function financeAuditWhere(role: UserRoleValue): Prisma.AuditLogWhereInput {
  if (role !== "FINANCE") return {};
  return {
    OR: [
      { action: { contains: "payment" } },
      { action: { contains: "wallet" } },
      { entity: { in: ["PaymentTransaction", "Wallet", "LedgerEntry", "PrizeDistribution"] } },
    ],
  };
}

export async function getAdminDashboard(role: UserRoleValue) {
  const matrix = adminRoleMatrix(role);

  const [
    totalSessions,
    liveSessions,
    completedSessions,
    paidRegistrations,
    noShowRegistrations,
    openIncidents,
    openSupportCases,
    pendingActions,
    totalUsers,
    activeUsers,
    playerUsers,
    operatorUsers,
    pendingPayments,
    successfulPayments,
    failedPayments,
    frozenWallets,
    prizeLedger,
  ] = await Promise.all([
    prisma.gameSession.count(),
    prisma.gameSession.count({
      where: { status: { in: [GameSessionStatus.ACTIVE, GameSessionStatus.WAITING_START, GameSessionStatus.LIVE] } },
    }),
    prisma.gameSession.count({ where: { status: GameSessionStatus.COMPLETED } }),
    prisma.sessionRegistration.count({
      where: { status: { in: [...PAID_ACCESS_REGISTRATION_STATUSES] } },
    }),
    prisma.sessionRegistration.count({ where: { status: SessionRegistrationStatus.NO_SHOW } }),
    prisma.incidentLog.count({ where: { resolvedAt: null } }),
    prisma.supportCase.count({
      where: { status: { in: [SupportCaseStatus.OPEN, SupportCaseStatus.IN_PROGRESS] } },
    }),
    prisma.adminActionApproval.count({ where: { status: AdminActionApprovalStatus.REQUESTED } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"] } } }),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.SUCCESSFUL } }),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.FAILED } }),
    prisma.wallet.count({ where: { isFrozen: true } }),
    prisma.ledgerEntry.aggregate({
      where: { direction: "CREDIT", type: "PRIZE" },
      _sum: { amountXaf: true },
    }),
  ]);

  return {
    role,
    scope: matrix,
    sessions: {
      total: totalSessions,
      live: liveSessions,
      completed: completedSessions,
    },
    registrations: {
      paid: paidRegistrations,
      noShow: noShowRegistrations,
    },
    incidents: {
      open: openIncidents,
    },
    support: {
      openCases: openSupportCases,
      pendingActions,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      players: playerUsers,
      operators: operatorUsers,
    },
    finance: matrix.canViewFinance
      ? {
          payments: {
            pending: pendingPayments,
            successful: successfulPayments,
            failed: failedPayments,
          },
          wallets: {
            frozen: frozenWallets,
          },
          creditsDistributedXaf: prizeLedger._sum.amountXaf ?? 0,
        }
      : null,
  };
}

export async function listSupportUsers(input: {
  q?: string;
  role?: UserRoleValue;
  page: number;
  limit: number;
}) {
  const where: Prisma.UserWhereInput = {
    ...(input.role ? { role: input.role } : {}),
    ...(input.q
      ? {
          OR: [
            { id: input.q },
            { email: { contains: input.q, mode: "insensitive" } },
            { phone: { contains: input.q } },
            { name: { contains: input.q, mode: "insensitive" } },
            { profile: { username: { contains: input.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const skip = (input.page - 1) * input.limit;
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        profile: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
        wallet: {
          select: {
            balanceXaf: true,
            currency: true,
            isFrozen: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            supportCasesForUser: true,
          },
        },
      },
    }),
  ]);

  return {
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile,
      wallet: user.wallet,
      registrationsCount: user._count.registrations,
      supportCasesCount: user._count.supportCasesForUser,
    })),
    meta: {
      total,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function listAuditLogs(input: {
  role: UserRoleValue;
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  requestId?: string;
  cursor?: string;
  limit: number;
}) {
  const where: Prisma.AuditLogWhereInput = {
    ...financeAuditWhere(input.role),
    ...(input.actorId ? { userId: input.actorId } : {}),
    ...(input.action ? { action: { contains: input.action } } : {}),
    ...(input.entity ? { entity: input.entity } : {}),
    ...(input.entityId ? { entityId: input.entityId } : {}),
    ...(input.requestId ? { requestId: input.requestId } : {}),
  };
  const rows = await prisma.auditLog.findMany({
    where,
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const entries = rows.slice(0, input.limit);
  const exposeData = input.role === "ADMIN" || input.role === "SUPER_ADMIN";

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      actorId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      reason: entry.reason,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      oldData: exposeData ? entry.oldData : null,
      newData: exposeData ? entry.newData : null,
      createdAt: entry.createdAt.toISOString(),
    })),
    nextCursor: rows.length > input.limit ? rows[input.limit]?.id ?? null : null,
  };
}

export async function getSupportUserView(input: { userId: string; role: UserRoleValue }) {
  const matrix = adminRoleMatrix(input.role);
  const [user, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        profile: {
          select: {
            username: true,
            avatarUrl: true,
            isPublic: true,
            level: true,
            xp: true,
          },
        },
        wallet: {
          select: {
            id: true,
            balanceXaf: true,
            currency: true,
            isFrozen: true,
            updatedAt: true,
            ledgers: matrix.canViewLedger
              ? {
                  take: 20,
                  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                  select: {
                    id: true,
                    amountXaf: true,
                    balanceAfterXaf: true,
                    direction: true,
                    type: true,
                    referenceType: true,
                    referenceId: true,
                    sessionId: true,
                    createdAt: true,
                  },
                }
              : false,
          },
        },
        registrations: {
          take: 10,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            status: true,
            createdAt: true,
            session: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                startTime: true,
              },
            },
          },
        },
        supportCasesForUser: {
          take: 10,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            status: true,
            subject: true,
            createdAt: true,
            closedAt: true,
          },
        },
      },
    }),
    prisma.paymentTransaction.findMany({
      where: { userId: input.userId },
      take: 10,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        sessionId: true,
        registrationId: true,
        amountXaf: true,
        currency: true,
        status: true,
        provider: true,
        providerStatus: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!user) return { type: "not-found" as const };

  return {
    type: "ok" as const,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile,
      registrations: user.registrations.map((registration) => ({
        id: registration.id,
        status: registration.status,
        createdAt: registration.createdAt.toISOString(),
        session: {
          ...registration.session,
          startTime: serializeDate(registration.session.startTime),
        },
      })),
      payments: payments.map((payment) => ({
        ...payment,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      })),
      wallet: user.wallet
        ? {
            id: user.wallet.id,
            balanceXaf: user.wallet.balanceXaf,
            currency: user.wallet.currency,
            isFrozen: user.wallet.isFrozen,
            updatedAt: user.wallet.updatedAt.toISOString(),
            ledgers:
              "ledgers" in user.wallet && Array.isArray(user.wallet.ledgers)
                ? user.wallet.ledgers.map((ledger) => ({
                    ...ledger,
                    createdAt: ledger.createdAt.toISOString(),
                  }))
                : [],
          }
        : null,
      supportCases: user.supportCasesForUser.map((supportCase) => ({
        ...supportCase,
        createdAt: supportCase.createdAt.toISOString(),
        closedAt: serializeDate(supportCase.closedAt),
      })),
    },
  };
}

export async function createSupportCase(input: {
  targetUserId: string;
  adminUserId: string;
  data: z.infer<typeof createSupportCaseSchema>;
  context: ReturnType<typeof auditContext>;
}) {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId }, select: { id: true } });
  if (!target) return { type: "not-found" as const };

  const supportCase = await prisma.$transaction(async (tx) => {
    const created = await tx.supportCase.create({
      data: {
        userId: input.targetUserId,
        createdById: input.adminUserId,
        subject: input.data.subject,
        description: input.data.description,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.adminUserId,
        action: "support.case-created",
        entity: "SupportCase",
        entityId: created.id,
        reason: input.data.reason,
        newData: { userId: input.targetUserId, subject: input.data.subject },
        ...input.context,
      },
    });
    return created;
  });

  return { type: "ok" as const, supportCase };
}

export async function createIncident(input: {
  adminUserId: string;
  data: z.infer<typeof createIncidentSchema>;
  context: ReturnType<typeof auditContext>;
}) {
  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.incidentLog.create({
      data: {
        createdById: input.adminUserId,
        sessionId: input.data.sessionId,
        severity: input.data.severity as IncidentSeverity,
        category: input.data.category,
        title: input.data.title,
        description: input.data.description,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.adminUserId,
        action: "incident.created",
        entity: "IncidentLog",
        entityId: created.id,
        reason: input.data.reason,
        newData: {
          sessionId: input.data.sessionId,
          severity: input.data.severity,
          category: input.data.category,
          title: input.data.title,
        },
        ...input.context,
      },
    });
    return created;
  });

  return incident;
}

export async function createAdminActionRequest(input: {
  adminUserId: string;
  data: z.infer<typeof createAdminActionSchema>;
  context: ReturnType<typeof auditContext>;
}) {
  const action = await prisma.$transaction(async (tx) => {
    const created = await tx.adminActionApproval.create({
      data: {
        action: input.data.action,
        entity: input.data.entity,
        entityId: input.data.entityId,
        reason: input.data.reason,
        requestedById: input.adminUserId,
        payload: jsonObject(input.data.payload),
        beforeData: jsonObject(input.data.beforeData),
        afterData: jsonObject(input.data.afterData),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.adminUserId,
        action: "admin.action-requested",
        entity: "AdminActionApproval",
        entityId: created.id,
        reason: input.data.reason,
        newData: {
          action: input.data.action,
          entity: input.data.entity,
          entityId: input.data.entityId,
        },
        ...input.context,
      },
    });
    return created;
  });

  return action;
}

export async function approveAdminAction(input: {
  actionId: string;
  approverUserId: string;
  reason: string;
  context: ReturnType<typeof auditContext>;
}) {
  const existing = await prisma.adminActionApproval.findUnique({ where: { id: input.actionId } });
  if (!existing) return { type: "not-found" as const };
  if (existing.status !== AdminActionApprovalStatus.REQUESTED || existing.requestedById === input.approverUserId) {
    return { type: "not-approvable" as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const action = await tx.adminActionApproval.update({
      where: { id: input.actionId },
      data: {
        status: AdminActionApprovalStatus.APPROVED,
        approvedById: input.approverUserId,
        approvalReason: input.reason,
        decidedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.approverUserId,
        action: "admin.action-approved",
        entity: "AdminActionApproval",
        entityId: input.actionId,
        reason: input.reason,
        oldData: { status: existing.status },
        newData: { status: action.status, approvedById: input.approverUserId },
        ...input.context,
      },
    });
    return action;
  });

  return { type: "ok" as const, action: updated };
}
