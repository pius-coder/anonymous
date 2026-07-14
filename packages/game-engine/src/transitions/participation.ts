import { ParticipationStatus, type GameParticipation } from "../types/participation.js"
import { InvalidTransitionError } from "../errors.js"

export const PARTICIPATION_TRANSITIONS: Record<ParticipationStatus, ParticipationStatus[]> = {
  [ParticipationStatus.UNSPECIFIED]: [],
  [ParticipationStatus.Invited]: [ParticipationStatus.Registered],
  [ParticipationStatus.Registered]: [ParticipationStatus.Paid],
  [ParticipationStatus.Paid]: [ParticipationStatus.Present],
  [ParticipationStatus.Present]: [ParticipationStatus.Ready],
  [ParticipationStatus.Ready]: [ParticipationStatus.InRoom],
  [ParticipationStatus.InRoom]: [ParticipationStatus.Playing],
  [ParticipationStatus.Playing]: [ParticipationStatus.FinishedRound, ParticipationStatus.Disconnected],
  [ParticipationStatus.FinishedRound]: [ParticipationStatus.WaitingReview],
  [ParticipationStatus.Disconnected]: [ParticipationStatus.Playing, ParticipationStatus.Abandoned],
  [ParticipationStatus.WaitingReview]: [ParticipationStatus.ResultsVisible],
  [ParticipationStatus.ResultsVisible]: [ParticipationStatus.Ready, ParticipationStatus.Completed],
  [ParticipationStatus.Completed]: [],
  [ParticipationStatus.Abandoned]: [],
}

export function canTransitionParticipation(from: ParticipationStatus, to: ParticipationStatus): boolean {
  return PARTICIPATION_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionParticipation(p: GameParticipation, target: ParticipationStatus): GameParticipation {
  if (!canTransitionParticipation(p.status, target)) {
    throw new InvalidTransitionError(ParticipationStatus[p.status], ParticipationStatus[target])
  }
  return { ...p, status: target }
}

export function acceptInvitation(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Registered)
}

export function confirmPayment(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Paid)
}

export function checkIn(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Present)
}

export function markReady(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Ready)
}

export function connectRealtime(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.InRoom)
}

export function startRoundForPlayer(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Playing)
}

export function finishPlayerRound(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.FinishedRound)
}

export function disconnectPlayer(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Disconnected)
}

export function reconnectPlayer(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Playing)
}

export function abandonPlayer(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Abandoned)
}

export function closePlayerRound(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.WaitingReview)
}

export function publishPlayerResults(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.ResultsVisible)
}

export function prepareNextRoundForPlayer(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Ready)
}

export function completePlayerParticipation(p: GameParticipation): GameParticipation {
  return transitionParticipation(p, ParticipationStatus.Completed)
}
