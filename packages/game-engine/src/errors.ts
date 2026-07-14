export class DomainError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "DomainError"
    this.code = code
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(fromState: string, toState: string) {
    super(
      "INVALID_TRANSITION",
      `Transition from ${fromState} to ${toState} is not allowed`,
    )
    this.name = "InvalidTransitionError"
  }
}

export class InvalidRoleError extends DomainError {
  constructor(role: string, action: string) {
    super(
      "INVALID_ROLE",
      `Role ${role} cannot perform ${action}`,
    )
    this.name = "InvalidRoleError"
  }
}

export class ParticipationNotFoundError extends DomainError {
  constructor(participationId: string) {
    super(
      "PARTICIPATION_NOT_FOUND",
      `Participation ${participationId} not found`,
    )
    this.name = "ParticipationNotFoundError"
  }
}

export class ScoreNotPublishableError extends DomainError {
  constructor(currentStatus: string) {
    super(
      "SCORE_NOT_PUBLISHABLE",
      `Score cannot be published in status ${currentStatus}`,
    )
    this.name = "ScoreNotPublishableError"
  }
}

export class GameNotFoundError extends DomainError {
  constructor(gameId: string) {
    super(
      "GAME_NOT_FOUND",
      `Game ${gameId} not found`,
    )
    this.name = "GameNotFoundError"
  }
}

export class InvalidPermissionError extends DomainError {
  constructor(role: string, permission: string) {
    super(
      "INVALID_PERMISSION",
      `Role ${role} lacks permission ${permission}`,
    )
    this.name = "InvalidPermissionError"
  }
}
