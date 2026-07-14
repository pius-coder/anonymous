import { ScoreStatus, type ScoreEntry } from "../types/score.js"
import { InvalidTransitionError, ScoreNotPublishableError } from "../errors.js"

export const SCORE_TRANSITIONS: Record<ScoreStatus, ScoreStatus[]> = {
  [ScoreStatus.UNSPECIFIED]: [],
  [ScoreStatus.Pending]: [ScoreStatus.Provisional, ScoreStatus.Voided],
  [ScoreStatus.Provisional]: [ScoreStatus.UnderReview, ScoreStatus.Published, ScoreStatus.Voided],
  [ScoreStatus.UnderReview]: [ScoreStatus.Corrected, ScoreStatus.Voided],
  [ScoreStatus.Corrected]: [ScoreStatus.Published],
  [ScoreStatus.Published]: [],
  [ScoreStatus.Voided]: [],
}

export function canTransitionScore(from: ScoreStatus, to: ScoreStatus): boolean {
  return SCORE_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionScore(entry: ScoreEntry, target: ScoreStatus): ScoreEntry {
  if (!canTransitionScore(entry.status, target)) {
    throw new InvalidTransitionError(ScoreStatus[entry.status], ScoreStatus[target])
  }
  const now = target === ScoreStatus.Published ? new Date() : null
  return { ...entry, status: target, publishedAt: entry.publishedAt ?? now }
}

export function setProvisional(entry: ScoreEntry): ScoreEntry {
  return transitionScore(entry, ScoreStatus.Provisional)
}

export function flagForReview(entry: ScoreEntry): ScoreEntry {
  return transitionScore(entry, ScoreStatus.UnderReview)
}

export function correctScore(entry: ScoreEntry): ScoreEntry {
  return transitionScore(entry, ScoreStatus.Corrected)
}

export function publishScore(entry: ScoreEntry): ScoreEntry {
  if (!canTransitionScore(entry.status, ScoreStatus.Published)) {
    throw new ScoreNotPublishableError(ScoreStatus[entry.status])
  }
  return transitionScore(entry, ScoreStatus.Published)
}

export function voidScore(entry: ScoreEntry): ScoreEntry {
  return transitionScore(entry, ScoreStatus.Voided)
}
