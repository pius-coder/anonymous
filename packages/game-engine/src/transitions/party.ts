import { GameStatus, type Game } from "../types/party.js"
import { InvalidTransitionError } from "../errors.js"

export const PARTY_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  [GameStatus.UNSPECIFIED]: [],
  [GameStatus.Draft]: [GameStatus.Scheduled, GameStatus.Cancelled],
  [GameStatus.Scheduled]: [GameStatus.PreparationOpen, GameStatus.Cancelled],
  [GameStatus.PreparationOpen]: [GameStatus.PreparationLocked, GameStatus.Cancelled],
  [GameStatus.PreparationLocked]: [GameStatus.RoundSetup],
  [GameStatus.RoundSetup]: [GameStatus.RoundBriefing],
  [GameStatus.RoundBriefing]: [GameStatus.RoundActive],
  [GameStatus.RoundActive]: [GameStatus.RoundClosing, GameStatus.Suspended],
  [GameStatus.RoundClosing]: [GameStatus.Verification],
  [GameStatus.Verification]: [GameStatus.ResultsPublished, GameStatus.RoundSetup],
  [GameStatus.ResultsPublished]: [GameStatus.RoundSetup, GameStatus.Completed],
  [GameStatus.Completed]: [],
  [GameStatus.Cancelled]: [],
  [GameStatus.Suspended]: [GameStatus.RoundActive, GameStatus.Failed],
  [GameStatus.Failed]: [GameStatus.PreparationOpen],
}

export function canTransitionParty(from: GameStatus, to: GameStatus): boolean {
  return PARTY_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionParty(game: Game, target: GameStatus): Game {
  if (!canTransitionParty(game.status, target)) {
    throw new InvalidTransitionError(GameStatus[game.status], GameStatus[target])
  }
  return { ...game, status: target }
}

export function schedule(game: Game): Game {
  return transitionParty(game, GameStatus.Scheduled)
}

export function openPreparation(game: Game): Game {
  return transitionParty(game, GameStatus.PreparationOpen)
}

export function lockPreparation(game: Game): Game {
  return transitionParty(game, GameStatus.PreparationLocked)
}

export function cancel(game: Game): Game {
  return transitionParty(game, GameStatus.Cancelled)
}

export function prepareRound(game: Game): Game {
  return transitionParty(game, GameStatus.RoundSetup)
}

export function startBriefing(game: Game): Game {
  return transitionParty(game, GameStatus.RoundBriefing)
}

export function startRound(game: Game): Game {
  return transitionParty(game, GameStatus.RoundActive)
}

export function closeRound(game: Game): Game {
  return transitionParty(game, GameStatus.RoundClosing)
}

export function computeProvisionalScores(game: Game): Game {
  return transitionParty(game, GameStatus.Verification)
}

export function publishResults(game: Game): Game {
  return transitionParty(game, GameStatus.ResultsPublished)
}

export function requestCorrection(game: Game): Game {
  return transitionParty(game, GameStatus.RoundSetup)
}

export function prepareNextRound(game: Game): Game {
  return transitionParty(game, GameStatus.RoundSetup)
}

export function completeGame(game: Game): Game {
  return transitionParty(game, GameStatus.Completed)
}

export function pause(game: Game): Game {
  return transitionParty(game, GameStatus.Suspended)
}

export function resume(game: Game): Game {
  return transitionParty(game, GameStatus.RoundActive)
}

export function fail(game: Game): Game {
  return transitionParty(game, GameStatus.Failed)
}

export function recover(game: Game): Game {
  return transitionParty(game, GameStatus.PreparationOpen)
}
