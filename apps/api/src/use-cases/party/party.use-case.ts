import { partyRepository, participationRepository } from "@session-jeu/db";
import { GameStatus, schedule, validateGameConfig } from "@session-jeu/game-engine";
import type { ComplianceIssue, PartyConfig } from "@session-jeu/game-engine";

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
};

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
};

export type UpdatePartyConfigInput = {
  id: string;
  name?: string;
  visibility?: string;
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
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
    parties.map((p) => participationRepository.countByPartyId(p.id)),
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

  const participantCount = await participationRepository.countByPartyId(party.id);

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

  const party = await partyRepository.createParty({
    code: input.code,
    name: input.name,
    visibility: input.visibility ?? "public",
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    roundProgram: input.roundProgram,
  });

  const participantCount = await participationRepository.countByPartyId(party.id);

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
  } satisfies AdminPartyDetail;
}

export async function getAdminParty(input: { id: string }): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const participantCount = await participationRepository.countByPartyId(party.id);

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
  } satisfies AdminPartyDetail;
}

export async function updatePartyConfig(input: UpdatePartyConfigInput): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

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

  const updated = await partyRepository.updateParty(input.id, {
    name: input.name,
    visibility: input.visibility,
    minPlayers: input.minPlayers,
    maxPlayers: input.maxPlayers,
    roundProgram: input.roundProgram,
  });

  const participantCount = await participationRepository.countByPartyId(updated.id);

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    status: updated.status,
    visibility: updated.visibility,
    scheduledAt: updated.scheduledAt?.toISOString() ?? null,
    minPlayers: updated.minPlayers,
    maxPlayers: updated.maxPlayers,
    roundProgram: updated.roundProgram,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    participantCount,
  } satisfies AdminPartyDetail;
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

export async function publishParty(input: { id: string }): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

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

  const domainGame = {
    id: party.id,
    status: GameStatus.Draft,
    code: party.code,
    name: party.name,
    scheduledAt: party.scheduledAt,
    visibility: party.visibility,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
  };

  schedule(domainGame);

  const updated = await partyRepository.updatePartyStatus(input.id, "SCHEDULED");

  const participantCount = await participationRepository.countByPartyId(updated.id);

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    status: updated.status,
    visibility: updated.visibility,
    scheduledAt: updated.scheduledAt?.toISOString() ?? null,
    minPlayers: updated.minPlayers,
    maxPlayers: updated.maxPlayers,
    roundProgram: updated.roundProgram,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    participantCount,
  } satisfies AdminPartyDetail;
}

export async function scheduleParty(input: SchedulePartyInput): Promise<AdminPartyDetail> {
  const party = await partyRepository.findPartyById(input.id);
  if (!party) {
    throw new PartyUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const scheduledDate = new Date(input.scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new PartyUseCaseError("INVALID_DATE", "La date planifiée est invalide", 422);
  }

  const schedulableStatuses = ["DRAFT", "SCHEDULED", "PREPARATION_OPEN"];
  if (!schedulableStatuses.includes(party.status)) {
    throw new PartyUseCaseError("PARTY_CANNOT_SCHEDULE", "Cette partie ne peut pas être planifiée dans son état actuel", 422);
  }

  const updated = await partyRepository.updateParty(input.id, { scheduledAt: scheduledDate });

  const participantCount = await participationRepository.countByPartyId(updated.id);

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    status: updated.status,
    visibility: updated.visibility,
    scheduledAt: updated.scheduledAt?.toISOString() ?? null,
    minPlayers: updated.minPlayers,
    maxPlayers: updated.maxPlayers,
    roundProgram: updated.roundProgram,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    participantCount,
  } satisfies AdminPartyDetail;
}
