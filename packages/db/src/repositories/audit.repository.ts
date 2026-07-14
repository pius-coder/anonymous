import type { AuditLog } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateAuditLogData } from "./types.js";

export function createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata ?? undefined,
      ipAddress: data.ipAddress,
    },
  });
}

export function listAuditLogs(
  options: { userId?: string; action?: string; entity?: string; skip?: number; take?: number } = {},
): Promise<AuditLog[]> {
  const { userId, action, entity, skip = 0, take = 50 } = options;
  return prisma.auditLog.findMany({
    where: { ...(userId ? { userId } : {}), ...(action ? { action } : {}), ...(entity ? { entity } : {}) },
    skip,
    take,
    orderBy: { createdAt: "desc" },
  });
}
