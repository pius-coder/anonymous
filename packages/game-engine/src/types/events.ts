

export type DomainEvent =
  | GameScheduledEvent
  | PreparationOpenedEvent
  | PreparationLockedEvent
  | RoundSetupEvent
  | RoundBriefedEvent
  | RoundStartedEvent
  | RoundClosedEvent
  | ScoreVerifiedEvent
  | ResultsPublishedEvent
  | NextRoundPreparedEvent
  | GameCompletedEvent
  | GameCancelledEvent
  | ParticipationRegisteredEvent
  | PaymentConfirmedEvent
  | CheckedInEvent
  | PlayerReadyEvent
  | PlayerConnectedEvent
  | PlayerDisconnectedEvent
  | PlayerReconnectedEvent
  | PlayerAbandonedEvent
  | PlayerFinishedRoundEvent

interface BaseEvent {
  timestamp: Date
}

export interface GameScheduledEvent extends BaseEvent {
  type: "GameScheduled"
  gameId: string
}

export interface PreparationOpenedEvent extends BaseEvent {
  type: "PreparationOpened"
  gameId: string
}

export interface PreparationLockedEvent extends BaseEvent {
  type: "PreparationLocked"
  gameId: string
}

export interface RoundSetupEvent extends BaseEvent {
  type: "RoundSetup"
  gameId: string
  roundNumber: number
}

export interface RoundBriefedEvent extends BaseEvent {
  type: "RoundBriefed"
  gameId: string
  roundNumber: number
}

export interface RoundStartedEvent extends BaseEvent {
  type: "RoundStarted"
  gameId: string
  roundNumber: number
}

export interface RoundClosedEvent extends BaseEvent {
  type: "RoundClosed"
  gameId: string
  roundNumber: number
}

export interface ScoreVerifiedEvent extends BaseEvent {
  type: "ScoreVerified"
  gameId: string
  roundNumber: number
}

export interface ResultsPublishedEvent extends BaseEvent {
  type: "ResultsPublished"
  gameId: string
  roundNumber: number
}

export interface NextRoundPreparedEvent extends BaseEvent {
  type: "NextRoundPrepared"
  gameId: string
  nextRoundNumber: number
}

export interface GameCompletedEvent extends BaseEvent {
  type: "GameCompleted"
  gameId: string
}

export interface GameCancelledEvent extends BaseEvent {
  type: "GameCancelled"
  gameId: string
}

export interface ParticipationRegisteredEvent extends BaseEvent {
  type: "ParticipationRegistered"
  gameId: string
  participationId: string
  userId: string
}

export interface PaymentConfirmedEvent extends BaseEvent {
  type: "PaymentConfirmed"
  participationId: string
}

export interface CheckedInEvent extends BaseEvent {
  type: "CheckedIn"
  participationId: string
}

export interface PlayerReadyEvent extends BaseEvent {
  type: "PlayerReady"
  participationId: string
}

export interface PlayerConnectedEvent extends BaseEvent {
  type: "PlayerConnected"
  participationId: string
}

export interface PlayerDisconnectedEvent extends BaseEvent {
  type: "PlayerDisconnected"
  participationId: string
}

export interface PlayerReconnectedEvent extends BaseEvent {
  type: "PlayerReconnected"
  participationId: string
}

export interface PlayerAbandonedEvent extends BaseEvent {
  type: "PlayerAbandoned"
  participationId: string
}

export interface PlayerFinishedRoundEvent extends BaseEvent {
  type: "PlayerFinishedRound"
  participationId: string
  roundNumber: number
}

export function createEvent<T extends DomainEvent>(event: T): T {
  return { ...event, timestamp: event.timestamp ?? new Date() }
}
