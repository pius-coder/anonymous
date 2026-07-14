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
  scheduledAt: Date | null
  visibility: string
}

export type CreateGameParams = {
  id: string
  code: string
  scheduledAt?: Date
  visibility?: string
}

export function createGame(params: CreateGameParams): Game {
  return {
    id: params.id,
    status: GameStatus.Draft,
    code: params.code,
    scheduledAt: params.scheduledAt ?? null,
    visibility: params.visibility ?? "public",
  }
}
