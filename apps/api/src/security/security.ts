import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@session-jeu/db";
import type { Prisma } from "@session-jeu/db";
import type {
  AntiCheatEventType as AntiCheatEventTypeValue,
  ModerationActionType as ModerationActionTypeValue,
  RiskSignalSeverity as RiskSignalSeverityValue,
  RiskSignalType as RiskSignalTypeValue,
} from "@session-jeu/db";
import type { Context } from "hono";
import { getClientIp, getRequestId, getUserAgent } from "../auth/session.js";

const ComplianceGateType = {
  WITHDRAWAL: "WITHDRAWAL",
  MINI_GAME_RISK: "MINI_GAME_RISK",
  LEGAL_WORDING: "LEGAL_WORDING",
  PUBLIC_LAUNCH: "PUBLIC_LAUNCH",
} as const;

const ComplianceGateStatus = {
  BLOCKED: "BLOCKED",
} as const;

const RiskSignalType = {
  ANTICHEAT: "ANTICHEAT",
} as const;

export const sessionRiskParamsSchema = z.object({
  id: z.string().min(1),
});

export const supportDisputeSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  roundId: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(1000),
  reason: z.string().trim().min(3).max(500),
});

export const moderationActionSchema = z.object({
  type: z.enum(["WARN_USER", "FREEZE_WALLET", "SUSPEND_USER", "RESTRICT_SESSION", "NOTE"]),
  targetUserId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(3).max(500),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const anticheatSignalSchema = z.object({
  type: z.enum(["DOUBLE_SUBMIT", "AUTO_CLICK", "LATE_INPUT", "LATENCY_ABUSE", "MANUAL_REVIEW"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  sessionId: z.string().trim().min(1).optional(),
  roundId: z.string().trim().min(1).optional(),
  playerActionId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  actionNonce: z.string().trim().min(1).max(200).optional(),
  latencyMs: z.number().int().min(0).max(60_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const minigameRiskSchema = z
  .object({
    chanceDominant: z.boolean().default(false),
    reviewed: z.boolean().default(false),
  })
  .optional();

const defaultGates = [
  {
    type: ComplianceGateType.WITHDRAWAL,
    scope: "global",
    reason: "Real-money withdrawals are disabled in V1.",
  },
  {
    type: ComplianceGateType.MINI_GAME_RISK,
    scope: "chance-dominant",
    reason: "Chance-dominant mini-games require legal validation before enablement.",
  },
  {
    type: ComplianceGateType.LEGAL_WORDING,
    scope: "public-session",
    reason: "Public launch wording must pass legal review.",
  },
  {
    type: ComplianceGateType.PUBLIC_LAUNCH,
    scope: "global",
    reason: "Public launch requires the legal compliance checklist.",
  },
] as const;

function hashValue(value: string | undefined) {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex");
}

function auditContext(c: Context) {
  return {
    requestId: getRequestId(c),
    ipAddress: getClientIp(c),
    userAgent: getUserAgent(c),
  };
}

function jsonObject(value: Record<string, unknown> | undefined) {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

function redactHash(value: string | null) {
  return value ? `${value.slice(0, 8)}...` : null;
}

function severityWeight(severity: string) {
  if (severity === "CRITICAL") return 100;
  if (severity === "HIGH") return 50;
  if (severity === "MEDIUM") return 20;
  return 5;
}

export async function ensureDefaultComplianceGates() {
  await Promise.all(
    defaultGates.map((gate) =>
      prisma.complianceGate.upsert({
        where: { type_scope: { type: gate.type, scope: gate.scope } },
        update: {},
        create: {
          type: gate.type,
          scope: gate.scope,
          status: ComplianceGateStatus.BLOCKED,
          reason: gate.reason,
        },
      }),
    ),
  );
}

export async function listComplianceGates() {
  await ensureDefaultComplianceGates();
  const gates = await prisma.complianceGate.findMany({
    orderBy: [{ type: "asc" }, { scope: "asc" }],
  });
  return gates.map((gate) => ({
    id: gate.id,
    type: gate.type,
    scope: gate.scope,
    status: gate.status,
    reason: gate.reason,
    decidedAt: gate.decidedAt?.toISOString() ?? null,
  }));
}

export async function setComplianceGateStatus(input: {
  gateId: string;
  status: "PASSED" | "WAIVED" | "BLOCKED";
  decidedById: string;
  evidence?: unknown;
  reason?: string;
}) {
  const gate = await prisma.complianceGate.update({
    where: { id: input.gateId },
    data: {
      status: input.status,
      decidedById: input.decidedById,
      decidedAt: new Date(),
      reason: input.reason ?? undefined,
      evidence:
        input.evidence === undefined ? undefined : (input.evidence as Prisma.InputJsonObject),
    },
  });
  return {
    id: gate.id,
    type: gate.type,
    scope: gate.scope,
    status: gate.status,
    reason: gate.reason,
    decidedAt: gate.decidedAt?.toISOString() ?? null,
  };
}

export async function assertPublicSessionCompliance(input: { visibility: string }) {
  if (input.visibility === "PRIVATE") return { type: "ok" as const };
  await ensureDefaultComplianceGates();
  const blocked = await prisma.complianceGate.findFirst({
    where: {
      status: ComplianceGateStatus.BLOCKED,
      OR: [
        { type: ComplianceGateType.PUBLIC_LAUNCH, scope: "global" },
        { type: ComplianceGateType.LEGAL_WORDING, scope: "public-session" },
      ],
    },
    orderBy: { type: "asc" },
  });
  if (!blocked) return { type: "ok" as const };
  return { type: "blocked" as const, gate: blocked };
}

export async function assertMiniGameRiskAllowed(risk: z.infer<typeof minigameRiskSchema>) {
  if (!risk?.chanceDominant || risk.reviewed) return { type: "ok" as const };
  await ensureDefaultComplianceGates();
  const blocked = await prisma.complianceGate.findUnique({
    where: {
      type_scope: { type: ComplianceGateType.MINI_GAME_RISK, scope: "chance-dominant" },
    },
  });
  if (blocked?.status === ComplianceGateStatus.BLOCKED) {
    return { type: "blocked" as const, gate: blocked };
  }
  return { type: "ok" as const };
}

export async function createRiskSignal(input: {
  type: string;
  severity: string;
  userId?: string;
  sessionId?: string;
  source: string;
  deviceHash?: string;
  ipAddress?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.riskSignal.create({
    data: {
      type: input.type as RiskSignalTypeValue,
      severity: input.severity as RiskSignalSeverityValue,
      userId: input.userId,
      sessionId: input.sessionId,
      source: input.source,
      deviceHash: hashValue(input.deviceHash),
      ipHash: hashValue(input.ipAddress),
      reason: input.reason,
      metadata: jsonObject(input.metadata),
    },
  });
}

export async function createAntiCheatSignal(input: z.infer<typeof anticheatSignalSchema>) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.antiCheatEvent.create({
      data: {
        type: input.type as AntiCheatEventTypeValue,
        severity: input.severity as RiskSignalSeverityValue,
        sessionId: input.sessionId,
        roundId: input.roundId,
        playerActionId: input.playerActionId,
        userId: input.userId,
        actionNonce: input.actionNonce,
        latencyMs: input.latencyMs,
        metadata: jsonObject(input.metadata),
      },
    });
    const risk = await tx.riskSignal.create({
      data: {
        type: RiskSignalType.ANTICHEAT,
        severity: input.severity as RiskSignalSeverityValue,
        userId: input.userId,
        sessionId: input.sessionId,
        source: "anticheat",
        reason: input.type,
        metadata: { antiCheatEventId: event.id, ...input.metadata },
      },
    });
    return { event, risk };
  });
}

export async function getSessionRisk(sessionId: string) {
  const [signals, antiCheatEvents] = await Promise.all([
    prisma.riskSignal.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
    prisma.antiCheatEvent.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
  ]);
  const riskScore = signals.reduce((sum, signal) => sum + severityWeight(signal.severity), 0);
  return {
    sessionId,
    riskScore,
    signalCount: signals.length,
    antiCheatEventCount: antiCheatEvents.length,
    signals: signals.map((signal) => ({
      id: signal.id,
      type: signal.type,
      severity: signal.severity,
      source: signal.source,
      reason: signal.reason,
      deviceHash: redactHash(signal.deviceHash),
      ipHash: redactHash(signal.ipHash),
      createdAt: signal.createdAt.toISOString(),
    })),
    antiCheatEvents: antiCheatEvents.map((event) => ({
      id: event.id,
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      roundId: event.roundId,
      latencyMs: event.latencyMs,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function createSupportDispute(input: {
  userId: string;
  data: z.infer<typeof supportDisputeSchema>;
  context: ReturnType<typeof auditContext>;
}) {
  const supportCase = await prisma.$transaction(async (tx) => {
    const created = await tx.supportCase.create({
      data: {
        userId: input.userId,
        createdById: input.userId,
        subject: input.data.subject,
        description: input.data.description,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        action: "dispute.created",
        entity: "SupportCase",
        entityId: created.id,
        reason: input.data.reason,
        newData: {
          sessionId: input.data.sessionId,
          roundId: input.data.roundId,
          subject: input.data.subject,
        },
        ...input.context,
      },
    });
    return created;
  });
  return supportCase;
}

export async function createModerationAction(input: {
  actorId: string;
  data: z.infer<typeof moderationActionSchema>;
  context: ReturnType<typeof auditContext>;
}) {
  return prisma.$transaction(async (tx) => {
    const action = await tx.moderationAction.create({
      data: {
        type: input.data.type as ModerationActionTypeValue,
        targetUserId: input.data.targetUserId,
        sessionId: input.data.sessionId,
        actorId: input.actorId,
        reason: input.data.reason,
        payload: jsonObject(input.data.payload),
      },
    });

    if (input.data.type === "FREEZE_WALLET" && input.data.targetUserId) {
      await tx.wallet.updateMany({
        where: { userId: input.data.targetUserId },
        data: { isFrozen: true },
      });
    }
    if (input.data.type === "SUSPEND_USER" && input.data.targetUserId) {
      await tx.user.update({
        where: { id: input.data.targetUserId },
        data: { isActive: false, sessionVersion: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.actorId,
        action: "moderation.action-applied",
        entity: "ModerationAction",
        entityId: action.id,
        reason: input.data.reason,
        newData: {
          type: input.data.type,
          targetUserId: input.data.targetUserId,
          sessionId: input.data.sessionId,
        },
        ...input.context,
      },
    });
    return action;
  });
}

export function securityAuditContext(c: Context) {
  return auditContext(c);
}
