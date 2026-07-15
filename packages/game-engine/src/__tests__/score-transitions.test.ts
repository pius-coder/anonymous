import { describe, expect, it } from "vitest"
import { InvalidTransitionError, ScoreNotPublishableError, ScoreNotVerifiedError } from "../errors.js"
import { ScoreStatus, type ScoreEntry } from "../types/score.js"
import {
  canTransitionScore,
  correctScore,
  flagForReview,
  publishScore,
  SCORE_TRANSITIONS,
  setProvisional,
  verifyScore,
  voidScore,
} from "../transitions/score.js"

function makeScore(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    roundId: "r-1",
    participationId: "p-1",
    status: ScoreStatus.Pending,
    score: 42,
    rank: 1,
    evidenceHash: "evidence-hash",
    publishedAt: null,
    ...overrides,
  }
}

describe("SCORE_TRANSITIONS", () => {
  it("defines valid transitions for every state", () => {
    const allStates = Object.values(ScoreStatus).filter((v) => typeof v === "number") as ScoreStatus[]
    for (const state of allStates) {
      expect(SCORE_TRANSITIONS[state]).toBeDefined()
    }
  })
})

describe("score lifecycle transitions", () => {
  it("creates a provisional score from pending", () => {
    const score = makeScore({ status: ScoreStatus.Pending })
    expect(setProvisional(score).status).toBe(ScoreStatus.Provisional)
  })

  it("moves provisional score under review", () => {
    const score = makeScore({ status: ScoreStatus.Provisional })
    expect(flagForReview(score).status).toBe(ScoreStatus.UnderReview)
  })

  it("allows correction before verification", () => {
    const score = makeScore({ status: ScoreStatus.UnderReview })
    expect(correctScore(score).status).toBe(ScoreStatus.Corrected)
  })

  it("publishes only after verification", () => {
    const score = makeScore({ status: ScoreStatus.Corrected })
    const verified = verifyScore(score)
    const published = publishScore(verified)
    expect(verified.status).toBe(ScoreStatus.Verified)
    expect(published.status).toBe(ScoreStatus.Published)
    expect(published.publishedAt).toBeInstanceOf(Date)
  })

  it("can void non-published scores", () => {
    const score = makeScore({ status: ScoreStatus.Verified })
    expect(voidScore(score).status).toBe(ScoreStatus.Voided)
  })
})

describe("score forbidden transitions", () => {
  it("does not publish provisional scores", () => {
    const score = makeScore({ status: ScoreStatus.Provisional })
    expect(() => publishScore(score)).toThrow(ScoreNotVerifiedError)
  })

  it("does not publish under-review scores", () => {
    const score = makeScore({ status: ScoreStatus.UnderReview })
    expect(() => publishScore(score)).toThrow(ScoreNotVerifiedError)
  })

  it("does not skip from pending to verified", () => {
    const score = makeScore({ status: ScoreStatus.Pending })
    expect(() => verifyScore(score)).toThrow(InvalidTransitionError)
  })

  it("does not transition after publication", () => {
    expect(canTransitionScore(ScoreStatus.Published, ScoreStatus.Voided)).toBe(false)
  })

  it("reports already published scores as not publishable", () => {
    const score = makeScore({ status: ScoreStatus.Published, publishedAt: new Date() })
    expect(() => publishScore(score)).toThrow(ScoreNotPublishableError)
  })
})

describe("score immutability", () => {
  it("does not mutate the original score", () => {
    const score = makeScore({ status: ScoreStatus.Provisional })
    flagForReview(score)
    expect(score.status).toBe(ScoreStatus.Provisional)
  })
})
