export {
  DomainError,
  InvalidTransitionError,
  InvalidRoleError,
  ParticipationNotFoundError,
  ScoreNotPublishableError,
  GameNotFoundError,
} from "./errors.js"

export {
  GameStatus,
  type Game,
  type CreateGameParams,
  createGame,
} from "./types/index.js"

export {
  ParticipationStatus,
  type ReadinessState,
  type ConnectionState,
  type ParticipationRole,
  type ParticipationRights,
  type GameParticipation,
  type CreateParticipationParams,
  createParticipation,
  rightsForRole,
} from "./types/index.js"

export {
  RoundStatus,
  type Round,
  type CreateRoundParams,
  createRound,
} from "./types/index.js"

export {
  ScoreStatus,
  type ProvisionalScore,
  type PublishedScore,
  type ScoreEntry,
} from "./types/index.js"

export {
  type DomainEvent,
  createEvent,
} from "./types/index.js"

export {
  PARTY_TRANSITIONS,
  canTransitionParty,
  transitionParty,
  schedule,
  openPreparation,
  lockPreparation,
  cancel,
  prepareRound,
  startBriefing,
  startRound,
  closeRound,
  computeProvisionalScores,
  publishResults,
  requestCorrection,
  prepareNextRound,
  completeGame,
  pause,
  resume,
  fail,
  recover,
  PARTICIPATION_TRANSITIONS,
  canTransitionParticipation,
  transitionParticipation,
  acceptInvitation,
  confirmPayment,
  checkIn,
  markReady,
  connectRealtime,
  startRoundForPlayer,
  finishPlayerRound,
  disconnectPlayer,
  reconnectPlayer,
  abandonPlayer,
  closePlayerRound,
  publishPlayerResults,
  prepareNextRoundForPlayer,
  completePlayerParticipation,
  SCORE_TRANSITIONS,
  canTransitionScore,
  transitionScore,
  setProvisional,
  flagForReview,
  correctScore,
  publishScore,
  voidScore,
} from "./transitions/index.js"
