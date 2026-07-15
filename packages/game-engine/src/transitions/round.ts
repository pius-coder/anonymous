import { InvalidTransitionError } from "../errors.js"
import { RoundStatus, type Round } from "../types/round.js"

export const ROUND_TRANSITIONS: Record<RoundStatus, RoundStatus[]> = {
  [RoundStatus.UNSPECIFIED]: [],
  [RoundStatus.Setup]: [RoundStatus.Briefing],
  [RoundStatus.Briefing]: [RoundStatus.Active],
  [RoundStatus.Active]: [RoundStatus.Closing, RoundStatus.Suspended],
  [RoundStatus.Closing]: [RoundStatus.Verified],
  [RoundStatus.Resolved]: [RoundStatus.Verified],
  [RoundStatus.Verified]: [RoundStatus.Published],
  [RoundStatus.Published]: [],
  [RoundStatus.Suspended]: [RoundStatus.Active, RoundStatus.Closing],
}

export function canTransitionRound(from: RoundStatus, to: RoundStatus): boolean {
  return ROUND_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionRound(round: Round, target: RoundStatus): Round {
  if (!canTransitionRound(round.status, target)) {
    throw new InvalidTransitionError(RoundStatus[round.status], RoundStatus[target])
  }

  return { ...round, status: target }
}

export function startRoundBriefing(round: Round): Round {
  return transitionRound(round, RoundStatus.Briefing)
}

export function activateRound(round: Round): Round {
  return transitionRound(round, RoundStatus.Active)
}

export function closeRoundForResolution(round: Round): Round {
  return transitionRound(round, RoundStatus.Closing)
}

export function enterRoundVerification(round: Round): Round {
  return transitionRound(round, RoundStatus.Verified)
}

export function markRoundResolved(round: Round): Round {
  return transitionRound(round, RoundStatus.Resolved)
}

export function markRoundVerified(round: Round): Round {
  return transitionRound(round, RoundStatus.Verified)
}

export function publishRound(round: Round): Round {
  return transitionRound(round, RoundStatus.Published)
}

export function pauseRound(round: Round, now = new Date()): Round {
  const next = transitionRound(round, RoundStatus.Suspended)
  const remainingMs = round.deadlineAt ? Math.max(0, round.deadlineAt.getTime() - now.getTime()) : null

  return {
    ...next,
    pausedAt: now,
    remainingMs,
  }
}

export function resumeRound(round: Round, now = new Date()): Round {
  const next = transitionRound(round, RoundStatus.Active)
  const deadlineAt = round.remainingMs == null ? round.deadlineAt ?? null : new Date(now.getTime() + round.remainingMs)

  return {
    ...next,
    deadlineAt,
    pausedAt: null,
    remainingMs: null,
  }
}

export function isRoundInputAccepted(round: Round): boolean {
  return round.status === RoundStatus.Active
}
