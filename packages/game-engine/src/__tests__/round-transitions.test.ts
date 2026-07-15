import { describe, expect, it } from "vitest"
import { InvalidTransitionError } from "../errors.js"
import { createRound, RoundStatus } from "../types/round.js"
import {
  activateRound,
  canTransitionRound,
  closeRoundForResolution,
  markRoundResolved,
  markRoundVerified,
  publishRound,
  ROUND_TRANSITIONS,
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

  it("moves from closing to resolved", () => {
    const round = makeRound({ status: RoundStatus.Closing })
    expect(markRoundResolved(round).status).toBe(RoundStatus.Resolved)
  })

  it("requires verification before publication", () => {
    const resolved = makeRound({ status: RoundStatus.Resolved })
    const verified = markRoundVerified(resolved)
    expect(verified.status).toBe(RoundStatus.Verified)
    expect(publishRound(verified).status).toBe(RoundStatus.Published)
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
})

describe("round immutability", () => {
  it("does not mutate the original round", () => {
    const round = makeRound({ status: RoundStatus.Active })
    closeRoundForResolution(round)
    expect(round.status).toBe(RoundStatus.Active)
  })
})
