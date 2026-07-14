import type { Game } from "./party.js"

export enum ParticipationStatus {
  UNSPECIFIED = 0,
  Invited = 1,
  Registered = 2,
  Paid = 3,
  Present = 4,
  Ready = 5,
  InRoom = 6,
  Playing = 7,
  FinishedRound = 8,
  Disconnected = 9,
  WaitingReview = 10,
  ResultsVisible = 11,
  Completed = 12,
  Abandoned = 13,
}

export type ReadinessState = "offline" | "connected" | "present" | "ready" | "noResponse"

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "expired"

export type ParticipationRole = "player" | "adminPrimary" | "adminAssistant" | "support" | "finance" | "readObserver"

export interface ParticipationRights {
  canStart: boolean
  canVerify: boolean
  canPublish: boolean
  canObserve: boolean
}

export interface GameParticipation {
  id: string
  gameId: string
  userId: string
  role: ParticipationRole
  status: ParticipationStatus
  readinessState: ReadinessState
  connectionState: ConnectionState
  rights: ParticipationRights
}

export type CreateParticipationParams = {
  id: string
  gameId: string
  userId: string
  role?: ParticipationRole
}

export function createParticipation(params: CreateParticipationParams): GameParticipation {
  const role = params.role ?? "player"
  return {
    id: params.id,
    gameId: params.gameId,
    userId: params.userId,
    role,
    status: ParticipationStatus.Invited,
    readinessState: "offline",
    connectionState: "disconnected",
    rights: rightsForRole(role),
  }
}

export function rightsForRole(role: ParticipationRole): ParticipationRights {
  switch (role) {
    case "adminPrimary":
      return { canStart: true, canVerify: true, canPublish: true, canObserve: true }
    case "adminAssistant":
      return { canStart: false, canVerify: false, canPublish: false, canObserve: true }
    case "support":
      return { canStart: false, canVerify: false, canPublish: false, canObserve: true }
    case "finance":
      return { canStart: false, canVerify: false, canPublish: false, canObserve: false }
    case "readObserver":
      return { canStart: false, canVerify: false, canPublish: false, canObserve: true }
    case "player":
      return { canStart: false, canVerify: false, canPublish: false, canObserve: false }
  }
}

export function canRegister(game: Game, currentCount: number): { allowed: boolean; reason?: string } {
  if (game.maxPlayers != null && game.maxPlayers > 0 && currentCount >= game.maxPlayers) {
    return { allowed: false, reason: "PARTY_FULL" }
  }
  return { allowed: true }
}

export function registerParticipant(params: CreateParticipationParams): GameParticipation {
  const p = createParticipation(params)
  return { ...p, status: ParticipationStatus.Registered }
}

export type ReadinessStats = {
  total: number
  present: number
  ready: number
  noResponse: number
  absent: number
}

export function computeReadinessStats(participations: GameParticipation[]): ReadinessStats {
  const stats: ReadinessStats = { total: participations.length, present: 0, ready: 0, noResponse: 0, absent: 0 }

  for (const p of participations) {
    if (p.status === ParticipationStatus.Abandoned) {
      stats.absent++
    } else if (p.status === ParticipationStatus.Ready) {
      stats.ready++
    } else if (p.status === ParticipationStatus.Present) {
      stats.present++
    } else if (p.readinessState === "noResponse") {
      stats.noResponse++
    }
  }

  return stats
}
