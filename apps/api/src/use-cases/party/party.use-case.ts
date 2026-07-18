import type { Party } from "@prisma/client";
import { partyRepository, participationRepository, auditRepository } from "@session-jeu/db";
import {
  GameStatus,
  cancel as domainCancelParty,
  completeGame as domainCompleteGame,
  schedule,
  validateGameConfig,
  InvalidTransitionError,
} from "@session-jeu/game-engine";
import type { ComplianceIssue, Game, PartyConfig } from "@session-jeu/game-engine";

export class PartyUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "PartyUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type PublicPartyListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  participantCount: number;
  roundProgram: unknown;
  description: string | null;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
};

export type PublicPartyDetail = {
  id: string;
  code: string;
  name: string;
  status: string;
  visibility: string;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
  participantCount: number;
  createdAt: string;
  description: string | null;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
};

export type AdminPartyDetail = {
  id: string;
  code: string;
  name: string;
  status: string;
  visibility: string;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  description: string | null;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
};

export type OptimisticConcurrencyInput = {
  expectedUpdatedAt?: string;
  expectedConfigVersion?: number;
};

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return null;
    }
  }
  return null;
}

function toAdminDetail(party: Party, participantCount: number): AdminPartyDetail {
  return {
    id: party.id,
    code: party.code,
    name: party.name,
    status: party.status,
    visibility: party.visibility,
    scheduledAt: party.scheduledAt?.toISOString() ?? null,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
    createdAt: party.createdAt.toISOString(),
    updatedAt: party.updatedAt.toISOString(),
    participantCount,
    description: party.description ?? null,
    entryFeeAmount: decimalToNumber(party.entryFeeAmount),
    entryFeeCurrency: party.entryFeeCurrency ?? "XAF",
    configVersion: party.configVersion ?? 1,
    feeVersion: party.feeVersion ?? 1,
  };
}

function assertOptimistic(party: Party, input?: OptimisticConcurrencyInput): void {
  if (!input) return;
  if (input.expectedUpdatedAt) {
    const expected = new Date(input.expectedUpdatedAt).getTime();
    if (Number.isNaN(expected)) {
      throw new PartyUseCaseError("INVALID_ARGUMENT", "expectedUpdatedAt invalide", 400);
    }
    if (party.updatedAt.getTime() !== expected) {
      throw new PartyUseCaseError(
        "STALE_STATE",
        "L'état de la partie a changé; rechargez avant de commander",
        409,
      );
    }
  }
  if (input.expectedConfigVersion != null && party.configVersion !== input.expectedConfigVersion) {
    throw new PartyUseCaseError(
      "STALE_STATE",
      "La configuration a changé (configVersion); rechargez avant de commander",
      409,
    );
  }
}

function dbStatusToGameStatus(status: string): GameStatus {
  switch (status) {
    case "DRAFT":
      return GameStatus.Draft;
    case "SCHEDULED":
      return GameStatus.Scheduled;
    case "PREPARATION_OPEN":
      return GameStatus.PreparationOpen;
    case "PREPARATION_LOCKED":
    case "READY_TO_START":
      return GameStatus.PreparationLocked;
    case "ROUND_SETUP":
      return GameStatus.RoundSetup;
    case "ROUND_BRIEFING":
      return GameStatus.RoundBriefing;
    case "ROUND_ACTIVE":
    case "ACTIVE_ROUND":
      return GameStatus.RoundActive;
    case "ROUND_CLOSING":
    case "ROUND_RESOLVING":
      return GameStatus.RoundClosing;
    case "ROUND_VERIFICATION":
    case "WAITING_REVIEW":
    case "VERIFICATION":
      return GameStatus.Verification;
    case "RESULTS_PUBLISHED":
      return GameStatus.ResultsPublished;
    case "COMPLETED":
      return GameStatus.Completed;
    case "CANCELLED":
      return GameStatus.Cancelled;
    case "PAUSED":
    case "SUSPENDED":
      return GameStatus.Suspended;
    case "FAILED":
      return GameStatus.Failed;
    default:
      return GameStatus.UNSPECIFIED;
  }
}

function gameStatusToDb(status: GameStatus): string {
  switch (status) {
    case GameStatus.Draft:
      return "DRAFT";
    case GameStatus.Scheduled:
      return "SCHEDULED";
    case GameStatus.PreparationOpen:
      return "PREPARATION_OPEN";
    case GameStatus.PreparationLocked:
      return "PREPARATION_LOCKED";
    case GameStatus.RoundSetup:
      return "ROUND_SETUP";
    case GameStatus.RoundBriefing:
      return "ROUND_BRIEFING";
    case GameStatus.RoundActive:
      return "ROUND_ACTIVE";
    case GameStatus.RoundClosing:
      return "ROUND_CLOSING";
    case GameStatus.Verification:
      return "ROUND_VERIFICATION";
    case GameStatus.ResultsPublished:
      return "RESULTS_PUBLISHED";
    case GameStatus.Completed:
      return "COMPLETED";
    case GameStatus.Cancelled:
      return "CANCELLED";
    case GameStatus.Suspended:
      return "PAUSED";
    case GameStatus.Failed:
      return "FAILED";
    default:
      return "DRAFT";
  }
}

function toDomainGame(party: Party): Game {
  return {
    id: party.id,
    status: dbStatusToGameStatus(party.status),
    code: party.code,
    name: party.name,
    scheduledAt: party.scheduledAt,
    visibility: party.visibility,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
  };
}

export type ListPublicPartiesInput = {
  skip?: number;
  take?: number;
};

export type ListPublicPartiesResult = {
  parties: PublicPartyListItem[];
  total: number;
};

export type CreatePartyDraftInput = {
  code: string;
  name: string;
  visibility?: string;
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  description?: string;
  entryFeeAmount?: number | null;
  entryFeeCurrency?: string;
  scheduledAt?: string;
};

export type UpdatePartyConfigInput = {
  id: string;
  name?: string;
  visibility?: string;
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  description?: string | null;
  entryFeeAmount?: number | null;
  entryFeeCurrency?: string;
} & OptimisticConcurrencyInput;

export type ListAdminPartiesInput = {
  status?: string;
  skip?: number;
  take?: number;
};

export type ListAdminPartiesResult = {
  parties: AdminPartyDetail[];
  total: number;
};

export type ValidatePartyConfigResult = {
  valid: boolean;
  issues: ComplianceIssue[];
};

export type SchedulePartyInput = {
  id: string;
  scheduledAt: string;
};

export async function listPublicParties(input: ListPublicPartiesInput = {}): Promise<ListPublicPartiesResult> {
  const skip = input.skip ?? 0;
  const take = input.take ?? 50;
  const [parties, total] = await Promise.all([
    partyRepository.findPublicParties(skip, take),
    partyRepository.countPublicParties(),
  ]);

  const participantCounts = await Promise.all(
    parties.map((p) => participationRepository.countActiveByPartyId(p.id)),
  );

  return {
    parties: parties.map((p, i) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      minPlayers: p.minPlayers,
      maxPlayers: p.maxPlayers,
      participantCount: participantCounts[i],
      roundProgram: p.roundProgram,
      description: p.description ?? null,
      entryFeeAmount: decimalToNumber(p.entryFeeAmount),
      entryFeeCurrency: p.entryFeeCurrency ?? "XAF",
      configVersion: p.configVersion ?? 1,
      feeVersion: p.feeVersion ?? 1,
    })),
    total,
  } satisfies ListPublicPartiesResult;
}

export async function getPublicParty(input: { code: string }): Promise<PublicPartyDetail> {
  const party = await partyRepository.findPartyByCode(input.code);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const visibleStatuses = ["SCHEDULED", "PREPARATION_OPEN", "PREPARATION_LOCKED"];
  if (party.visibility !== "public" || !visibleStatuses.includes(party.status)) {
    throw new PartyUseCaseError("PARTY_INACCESSIBLE", "Cette partie n'est pas accessible", 404);
  }

  const participantCount = await participationRepository.countActiveByPartyId(party.id);

  return {
    id: party.id,
    code: party.code,
    name: party.name,
    status: party.status,
    visibility: party.visibility,
    scheduledAt: party.scheduledAt?.toISOString() ?? null,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
    participantCount,
    createdAt: party.createdAt.toISOString(),
    description: party.description ?? null,
    entryFeeAmount: decimalToNumber(party.entryFeeAmount),
    entryFeeCurrency: party.entryFeeCurrency ?? "XAF",
    configVersion: party.configVersion ?? 1,
    feeVersion: party.feeVersion ?? 1,
  } satisfies PublicPartyDetail;
}

export async function getPublicPartyById(input: { id: string }): Promise<PublicPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const visibleStatuses = ["SCHEDULED", "PREPARATION_OPEN", "PREPARATION_LOCKED"];
  if (party.visibility !== "public" || !visibleStatuses.includes(party.status)) {
    throw new PartyUseCaseError("PARTY_INACCESSIBLE", "Cette partie n'est pas accessible", 404);
  }

  const participantCount = await participationRepository.countActiveByPartyId(party.id);

  return {
    id: party.id,
    code: party.code,
    name: party.name,
    status: party.status,
    visibility: party.visibility,
    scheduledAt: party.scheduledAt?.toISOString() ?? null,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
    participantCount,
    createdAt: party.createdAt.toISOString(),
    description: party.description ?? null,
    entryFeeAmount: decimalToNumber(party.entryFeeAmount),
    entryFeeCurrency: party.entryFeeCurrency ?? "XAF",
    configVersion: party.configVersion ?? 1,
    feeVersion: party.feeVersion ?? 1,
  } satisfies PublicPartyDetail;
}

export async function createPartyDraft(input: CreatePartyDraftInput): Promise<AdminPartyDetail> {
  const existing = await partyRepository.findPartyByCode(input.code);
  if (existing) {
    throw new PartyUseCaseError("CODE_ALREADY_EXISTS", "Ce code de partie est déjà utilisé", 409);
  }

  const issues = validateGameConfig({
    name: input.name,
    visibility: input.visibility ?? "public",
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    roundProgram: input.roundProgram,
  });

  if (issues.length > 0) {
    throw new PartyUseCaseError("INVALID_CONFIG", `Configuration invalide: ${issues.map((i) => i.message).join("; ")}`, 422);
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw new PartyUseCaseError("INVALID_DATE", "La date planifiée est invalide", 422);
  }

  const party = await partyRepository.createParty({
    code: input.code,
    name: input.name,
    visibility: input.visibility ?? "public",
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    roundProgram: input.roundProgram,
    description: input.description,
    entryFeeAmount: input.entryFeeAmount ?? undefined,
    entryFeeCurrency: input.entryFeeCurrency,
    scheduledAt,
  });

  const participantCount = await participationRepository.countByPartyId(party.id);
  return toAdminDetail(party, participantCount);
}

export async function getAdminParty(input: { id: string }): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const participantCount = await participationRepository.countByPartyId(party.id);
  return toAdminDetail(party, participantCount);
}

export async function updatePartyConfig(input: UpdatePartyConfigInput): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  assertOptimistic(party, input);

  if (party.status !== "DRAFT") {
    throw new PartyUseCaseError("PARTY_NOT_EDITABLE", "Seules les parties en brouillon peuvent être modifiées", 422);
  }

  const config: PartyConfig = {
    name: input.name ?? party.name,
    visibility: input.visibility ?? party.visibility,
    minPlayers: input.minPlayers ?? party.minPlayers ?? undefined,
    maxPlayers: input.maxPlayers ?? party.maxPlayers ?? undefined,
    roundProgram: input.roundProgram ?? party.roundProgram,
  };

  const issues = validateGameConfig(config);
  if (issues.length > 0) {
    throw new PartyUseCaseError("INVALID_CONFIG", `Configuration invalide: ${issues.map((i) => i.message).join("; ")}`, 422);
  }

  const feeTouched =
    input.entryFeeAmount !== undefined ||
    (input.entryFeeCurrency !== undefined && input.entryFeeCurrency !== party.entryFeeCurrency);

  const updated = await partyRepository.updateParty(input.id, {
    name: input.name,
    visibility: input.visibility,
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    roundProgram: input.roundProgram,
    description: input.description,
    entryFeeAmount: input.entryFeeAmount,
    entryFeeCurrency: input.entryFeeCurrency,
    configVersion: (party.configVersion ?? 1) + 1,
    feeVersion: feeTouched ? (party.feeVersion ?? 1) + 1 : undefined,
  });

  const participantCount = await participationRepository.countByPartyId(updated.id);
  return toAdminDetail(updated, participantCount);
}

export async function validatePartyConfig(input: { id: string }): Promise<ValidatePartyConfigResult> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const issues = validateGameConfig({
    name: party.name,
    visibility: party.visibility,
    minPlayers: party.minPlayers ?? undefined,
    maxPlayers: party.maxPlayers ?? undefined,
    roundProgram: party.roundProgram,
  });

  return { valid: issues.length === 0, issues } satisfies ValidatePartyConfigResult;
}

export async function publishParty(
  input: { id: string; actorId?: string; reason?: string } & OptimisticConcurrencyInput,
): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  assertOptimistic(party, input);

  if (party.status !== "DRAFT") {
    throw new PartyUseCaseError("PARTY_ALREADY_PUBLISHED", "Cette partie a déjà été publiée", 422);
  }

  const issues = validateGameConfig({
    name: party.name,
    visibility: party.visibility,
    minPlayers: party.minPlayers ?? undefined,
    maxPlayers: party.maxPlayers ?? undefined,
    roundProgram: party.roundProgram,
  });

  if (issues.length > 0) {
    throw new PartyUseCaseError("COMPLIANCE_BLOCKED", `La publication est bloquée par des problèmes de configuration: ${issues.map((i) => i.message).join("; ")}`, 422);
  }

  schedule(toDomainGame(party));

  const updated = await partyRepository.updatePartyStatus(input.id, "SCHEDULED");

  await auditRepository
    .createAuditLog({
      userId: input.actorId,
      action: "PARTY_PUBLISH",
      entity: "Party",
      entityId: input.id,
      result: "SUCCESS",
      reason: input.reason,
      metadata: { beforeStatus: party.status, afterStatus: updated.status },
    })
    .catch(() => undefined);

  const participantCount = await participationRepository.countByPartyId(updated.id);
  return toAdminDetail(updated, participantCount);
}

export async function scheduleParty(
  input: SchedulePartyInput & OptimisticConcurrencyInput & { actorId?: string },
): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  assertOptimistic(party, input);

  const scheduledDate = new Date(input.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new PartyUseCaseError("INVALID_DATE", "La date planifiée est invalide", 422);
  }

  const schedulableStatuses = ["DRAFT", "SCHEDULED", "PREPARATION_OPEN"];
  if (!schedulableStatuses.includes(party.status)) {
    throw new PartyUseCaseError("PARTY_CANNOT_SCHEDULE", "Cette partie ne peut pas être planifiée dans son état actuel", 422);
  }

  // Schedule only sets planned time — never activates a live party.
  const updated = await partyRepository.updateParty(input.id, { scheduledAt: scheduledDate });

  const participantCount = await participationRepository.countByPartyId(updated.id);
  return toAdminDetail(updated, participantCount);
}

export async function listAdminParties(input: ListAdminPartiesInput = {}): Promise<ListAdminPartiesResult> {
  const skip = input.skip ?? 0;
  const take = Math.min(input.take ?? 50, 100);
  const all = await partyRepository.listParties(0, 500);
  const filtered = input.status ? all.filter((p) => p.status === input.status) : all;
  const page = filtered.slice(skip, skip + take);
  const counts = await Promise.all(page.map((p) => participationRepository.countByPartyId(p.id)));
  return {
    parties: page.map((p, i) => toAdminDetail(p, counts[i])),
    total: filtered.length,
  };
}

export async function cancelParty(
  input: {
    id: string;
    actorId: string;
    reason: string;
  } & OptimisticConcurrencyInput,
): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  assertOptimistic(party, input);

  if (!input.reason?.trim()) {
    throw new PartyUseCaseError("REASON_REQUIRED", "Un motif d'audit est requis pour annuler", 422);
  }

  try {
    const next = domainCancelParty(toDomainGame(party));
    const updated = await partyRepository.updatePartyStatus(input.id, gameStatusToDb(next.status));
    await auditRepository
      .createAuditLog({
        userId: input.actorId,
        action: "PARTY_CANCEL",
        entity: "Party",
        entityId: input.id,
        result: "SUCCESS",
        reason: input.reason,
        metadata: { beforeStatus: party.status, afterStatus: updated.status },
      })
      .catch(() => undefined);
    const participantCount = await participationRepository.countByPartyId(updated.id);
    return toAdminDetail(updated, participantCount);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new PartyUseCaseError(
        "INVALID_TRANSITION",
        "Annulation interdite dans l'état actuel de la partie",
        422,
      );
    }
    throw err;
  }
}

export async function completeParty(
  input: {
    id: string;
    actorId: string;
    reason: string;
  } & OptimisticConcurrencyInput,
): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  assertOptimistic(party, input);

  if (!input.reason?.trim()) {
    throw new PartyUseCaseError("REASON_REQUIRED", "Un motif d'audit est requis pour terminer", 422);
  }

  try {
    const next = domainCompleteGame(toDomainGame(party));
    const updated = await partyRepository.updatePartyStatus(input.id, gameStatusToDb(next.status));
    await auditRepository
      .createAuditLog({
        userId: input.actorId,
        action: "PARTY_COMPLETE",
        entity: "Party",
        entityId: input.id,
        result: "SUCCESS",
        reason: input.reason,
        metadata: { beforeStatus: party.status, afterStatus: updated.status },
      })
      .catch(() => undefined);
    const participantCount = await participationRepository.countByPartyId(updated.id);
    return toAdminDetail(updated, participantCount);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new PartyUseCaseError(
        "INVALID_TRANSITION",
        "Fin de partie interdite dans l'état actuel",
        422,
      );
    }
    throw err;
  }
}

export async function listPartyAuditTimeline(input: {
  partyId: string;
  take?: number;
}): Promise<
  Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    entity: string;
    entityId: string | null;
    result: string | null;
    reason: string | null;
    createdAt: string;
  }>
> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const logs = await auditRepository.listAuditLogs({
    entity: "Party",
    take: Math.min(input.take ?? 100, 200),
  });

  return logs
    .filter((l) => l.entityId === input.partyId)
    .map((l) => ({
      id: l.id,
      action: l.action,
      actorUserId: l.userId ?? null,
      entity: l.entity,
      entityId: l.entityId ?? null,
      result: l.result ?? null,
      reason: l.reason ?? null,
      createdAt: l.createdAt.toISOString(),
    }));
}
