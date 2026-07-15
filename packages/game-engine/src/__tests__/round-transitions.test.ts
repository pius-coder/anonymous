import { describe, expect, it } from "vitest"
import { InvalidTransitionError } from "../errors.js"
import { createRound, RoundStatus } from "../types/round.js"
import {
  activateRound,
  canTransitionRound,
  closeRoundForResolution,
  enterRoundVerification,
  isRoundInputAccepted,
  markRoundVerified,
  pauseRound,
  publishRound,
  ROUND_TRANSITIONS,
  resumeRound,
  startRoundBriefing,
} from "../transitions/round.js"

function makeRound(overrides: Partial<ReturnType<typeof createRound>> = {}) {
  return {
    ...createRound({
      id: "r-1",
      gameId: "g-1",
      number: 1,
      miniGameKey: "memory-sequence",
    }),
    ...overrides,
  }
}

describe("ROUND_TRANSITIONS", () => {
  it("defines valid transitions for every state", () => {
    const allStates = Object.values(RoundStatus).filter((v) => typeof v === "number") as RoundStatus[]
    for (const state of allStates) {
      expect(ROUND_TRANSITIONS[state]).toBeDefined()
    }
  })
})

describe("round lifecycle transitions", () => {
  it("moves from setup to briefing", () => {
    const round = makeRound({ status: RoundStatus.Setup })
    expect(startRoundBriefing(round).status).toBe(RoundStatus.Briefing)
  })

  it("moves from briefing to active", () => {
    const round = makeRound({ status: RoundStatus.Briefing })
    expect(activateRound(round).status).toBe(RoundStatus.Active)
  })

  it("closes an active round for resolution", () => {
    const round = makeRound({ status: RoundStatus.Active })
    expect(closeRoundForResolution(round).status).toBe(RoundStatus.Closing)
  })

  it("moves from closing to verification", () => {
    const round = makeRound({ status: RoundStatus.Closing })
    expect(enterRoundVerification(round).status).toBe(RoundStatus.Verified)
  })

  it("requires verification before publication", () => {
    const closing = makeRound({ status: RoundStatus.Closing })
    const verified = enterRoundVerification(closing)
    expect(verified.status).toBe(RoundStatus.Verified)
    expect(publishRound(verified).status).toBe(RoundStatus.Published)
  })

  it("keeps legacy resolved internal before verification", () => {
    const resolved = makeRound({ status: RoundStatus.Resolved })
    expect(markRoundVerified(resolved).status).toBe(RoundStatus.Verified)
  })

  it("pauses and resumes an active round with a coherent deadline", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    const round = makeRound({
      status: RoundStatus.Active,
      deadlineAt: new Date("2026-01-01T00:01:30.000Z"),
    })

    const paused = pauseRound(round, now)
    expect(paused.status).toBe(RoundStatus.Suspended)
    expect(paused.remainingMs).toBe(90_000)

    const resumed = resumeRound(paused, new Date("2026-01-01T00:02:00.000Z"))
    expect(resumed.status).toBe(RoundStatus.Active)
    expect(resumed.deadlineAt?.toISOString()).toBe("2026-01-01T00:03:30.000Z")
  })

  it("can close a suspended round for verification", () => {
    const suspended = makeRound({ status: RoundStatus.Suspended })
    const closing = closeRoundForResolution(suspended)
    expect(closing.status).toBe(RoundStatus.Closing)
    expect(enterRoundVerification(closing).status).toBe(RoundStatus.Verified)
  })
})

describe("round forbidden transitions", () => {
  it("does not activate a round directly from setup", () => {
    const round = makeRound({ status: RoundStatus.Setup })
    expect(() => activateRound(round)).toThrow(InvalidTransitionError)
  })

  it("does not publish a resolved but unverified round", () => {
    const round = makeRound({ status: RoundStatus.Resolved })
    expect(() => publishRound(round)).toThrow(InvalidTransitionError)
  })

  it("does not reopen a published round", () => {
    expect(canTransitionRound(RoundStatus.Published, RoundStatus.Active)).toBe(false)
  })

  it("accepts player input only while active", () => {
    expect(isRoundInputAccepted(makeRound({ status: RoundStatus.Active }))).toBe(true)
    expect(isRoundInputAccepted(makeRound({ status: RoundStatus.Briefing }))).toBe(false)
    expect(isRoundInputAccepted(makeRound({ status: RoundStatus.Suspended }))).toBe(false)
    expect(isRoundInputAccepted(makeRound({ status: RoundStatus.Closing }))).toBe(false)
    expect(isRoundInputAccepted(makeRound({ status: RoundStatus.Verified }))).toBe(false)
  })
})

describe("round immutability", () => {
  it("does not mutate the original round", () => {
    const round = makeRound({ status: RoundStatus.Active })
    closeRoundForResolution(round)
    expect(round.status).toBe(RoundStatus.Active)
  })
})
