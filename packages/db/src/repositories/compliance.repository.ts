import type {
  ComplianceGate,
  ConsentRecord,
  Incident,
  RetentionPolicyRule,
  SupportAccessGrant,
} from "@prisma/client";
import {
  ComplianceGateStatus,
  ConsentStatus,
  IncidentStatus,
  Prisma,
  RetentionAction,
  SupportAccessStatus,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import type {
  CreateComplianceGateData,
  CreateConsentData,
  CreateIncidentData,
  CreateRetentionRuleData,
  CreateSupportAccessData,
} from "./types.js";

export function createIncident(data: CreateIncidentData): Promise<Incident> {
  return prisma.incident.create({
    data: {
      partyId: data.partyId,
      subject: data.subject,
      description: data.description,
      status: data.status ?? IncidentStatus.OPEN,
      openedById: data.openedById,
    },
  });
}

export function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident> {
  return prisma.incident.update({
    where: { id },
    data: {
      status,
      ...(status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED
        ? { resolvedAt: new Date() }
        : {}),
    },
  });
}

export function listIncidentsByParty(partyId: string): Promise<Incident[]> {
  return prisma.incident.findMany({
    where: { partyId },
    orderBy: { openedAt: "desc" },
  });
}

export function createComplianceGate(data: CreateComplianceGateData): Promise<ComplianceGate> {
  return prisma.complianceGate.create({
    data: {
      partyId: data.partyId,
      gateType: data.gateType,
      status: data.status ?? ComplianceGateStatus.OPEN,
      summary: data.summary,
      evidenceRefs: (data.evidenceRefs ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export function decideComplianceGate(input: {
  id: string;
  status: ComplianceGateStatus;
  decidedBy: string;
  reason?: string;
}): Promise<ComplianceGate> {
  return prisma.complianceGate.update({
    where: { id: input.id },
    data: {
      status: input.status,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
      reason: input.reason,
    },
  });
}

export function upsertRetentionRule(data: CreateRetentionRuleData): Promise<RetentionPolicyRule> {
  return prisma.retentionPolicyRule.upsert({
    where: {
      domain_entityType: { domain: data.domain, entityType: data.entityType },
    },
    create: {
      domain: data.domain,
      entityType: data.entityType,
      retainDays: data.retainDays,
      action: data.action ?? RetentionAction.KEEP,
      notes: data.notes,
      active: data.active ?? true,
    },
    update: {
      retainDays: data.retainDays,
      action: data.action ?? RetentionAction.KEEP,
      notes: data.notes,
      active: data.active ?? true,
    },
  });
}

export function listActiveRetentionRules(): Promise<RetentionPolicyRule[]> {
  return prisma.retentionPolicyRule.findMany({
    where: { active: true },
    orderBy: [{ domain: "asc" }, { entityType: "asc" }],
  });
}

export function grantConsent(data: CreateConsentData): Promise<ConsentRecord> {
  return prisma.consentRecord.upsert({
    where: {
      userId_policyKey_policyVersion: {
        userId: data.userId,
        policyKey: data.policyKey,
        policyVersion: data.policyVersion,
      },
    },
    create: {
      userId: data.userId,
      policyKey: data.policyKey,
      policyVersion: data.policyVersion,
      status: data.status ?? ConsentStatus.GRANTED,
      metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: {
      status: data.status ?? ConsentStatus.GRANTED,
      withdrawnAt: null,
      metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export function withdrawConsent(
  userId: string,
  policyKey: string,
  policyVersion: string,
): Promise<ConsentRecord> {
  return prisma.consentRecord.update({
    where: {
      userId_policyKey_policyVersion: { userId, policyKey, policyVersion },
    },
    data: {
      status: ConsentStatus.WITHDRAWN,
      withdrawnAt: new Date(),
    },
  });
}

export function createSupportAccessGrant(
  data: CreateSupportAccessData,
): Promise<SupportAccessGrant> {
  return prisma.supportAccessGrant.create({
    data: {
      ticketId: data.ticketId,
      requestedById: data.requestedById,
      purpose: data.purpose,
      reason: data.reason,
      keyId: data.keyId,
      status: data.status ?? SupportAccessStatus.REQUESTED,
      expiresAt: data.expiresAt,
    },
  });
}

export function approveSupportAccess(
  id: string,
  approvedById: string,
  expiresAt: Date,
): Promise<SupportAccessGrant> {
  return prisma.supportAccessGrant.update({
    where: { id },
    data: {
      status: SupportAccessStatus.APPROVED,
      approvedById,
      expiresAt,
    },
  });
}

export function revokeSupportAccess(id: string): Promise<SupportAccessGrant> {
  return prisma.supportAccessGrant.update({
    where: { id },
    data: {
      status: SupportAccessStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
}
