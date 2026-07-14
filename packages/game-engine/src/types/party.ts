export enum GameStatus {
  UNSPECIFIED = 0,
  Draft = 1,
  Scheduled = 2,
  PreparationOpen = 3,
  PreparationLocked = 4,
  RoundSetup = 5,
  RoundBriefing = 6,
  RoundActive = 7,
  RoundClosing = 8,
  Verification = 9,
  ResultsPublished = 10,
  Completed = 11,
  Cancelled = 12,
  Suspended = 13,
  Failed = 14,
}

export interface Game {
  id: string
  status: GameStatus
  code: string
  name: string
  scheduledAt: Date | null
  visibility: string
  minPlayers: number | null
  maxPlayers: number | null
  roundProgram: unknown
}

export type CreateGameParams = {
  id: string
  code: string
  name: string
  scheduledAt?: Date
  visibility?: string
  minPlayers?: number
  maxPlayers?: number
  roundProgram?: unknown
}

export function createGame(params: CreateGameParams): Game {
  return {
    id: params.id,
    status: GameStatus.Draft,
    code: params.code,
    name: params.name,
    scheduledAt: params.scheduledAt ?? null,
    visibility: params.visibility ?? "public",
    minPlayers: params.minPlayers ?? null,
    maxPlayers: params.maxPlayers ?? null,
    roundProgram: params.roundProgram ?? null,
  }
}

export type PartyConfig = {
  name: string
  visibility: string
  minPlayers?: number
  maxPlayers?: number
  roundProgram?: unknown
  scheduledAt?: Date
}

export type ComplianceIssue = {
  field: string
  code: string
  message: string
}

export function validateGameConfig(config: PartyConfig): ComplianceIssue[] {
  const issues: ComplianceIssue[] = []

  if (!config.name || config.name.trim().length === 0) {
    issues.push({ field: "name", code: "NAME_REQUIRED", message: "Le nom de la partie est requis" })
  }

  if (config.minPlayers != null && config.minPlayers < 2) {
    issues.push({ field: "minPlayers", code: "MIN_PLAYERS_TOO_LOW", message: "Le nombre minimum de joueurs doit être au moins 2" })
  }

  if (config.maxPlayers != null && config.maxPlayers < 2) {
    issues.push({ field: "maxPlayers", code: "MAX_PLAYERS_TOO_LOW", message: "Le nombre maximum de joueurs doit être au moins 2" })
  }

  if (config.minPlayers != null && config.maxPlayers != null && config.minPlayers > config.maxPlayers) {
    issues.push({ field: "maxPlayers", code: "MAX_LESS_THAN_MIN", message: "Le nombre maximum ne peut pas être inférieur au minimum" })
  }

  if (config.visibility && !["public", "private"].includes(config.visibility)) {
    issues.push({ field: "visibility", code: "INVALID_VISIBILITY", message: "La visibilité doit être 'public' ou 'private'" })
  }

  return issues
}
