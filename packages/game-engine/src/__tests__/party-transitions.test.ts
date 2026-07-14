import { describe, expect, it } from "vitest"
import { GameStatus, createGame } from "../types/party.js"
import {
  canTransitionParty,
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
  PARTY_TRANSITIONS,
} from "../transitions/party.js"
import { InvalidTransitionError } from "../errors.js"

function makeGame(overrides: Partial<ReturnType<typeof createGame>> = {}) {
  return { ...createGame({ id: "g-1", code: "TEST" }), ...overrides }
}

describe("PARTY_TRANSITIONS", () => {
  it("defines valid transitions for every state", () => {
    const allStates = Object.values(GameStatus).filter((v) => typeof v === "number") as GameStatus[]
    for (const state of allStates) {
      expect(PARTY_TRANSITIONS[state]).toBeDefined()
    }
  })
})

describe("canTransitionParty", () => {
  it("returns true for Draft -> Scheduled", () => {
    expect(canTransitionParty(GameStatus.Draft, GameStatus.Scheduled)).toBe(true)
  })

  it("returns false for Draft -> RoundActive (forbidden)", () => {
    expect(canTransitionParty(GameStatus.Draft, GameStatus.RoundActive)).toBe(false)
  })

  it("returns false for Scheduled -> RoundActive (forbidden by timer)", () => {
    expect(canTransitionParty(GameStatus.Scheduled, GameStatus.RoundActive)).toBe(false)
  })

  it("returns false for RoundClosing -> ResultsPublished (needs verification)", () => {
    expect(canTransitionParty(GameStatus.RoundClosing, GameStatus.ResultsPublished)).toBe(false)
  })
})

describe("party lifecycle transitions", () => {
  it("Draft -> Scheduled: schedule", () => {
    const game = makeGame({ status: GameStatus.Draft })
    const result = schedule(game)
    expect(result.status).toBe(GameStatus.Scheduled)
  })

  it("Scheduled -> PreparationOpen: openPreparation", () => {
    const game = makeGame({ status: GameStatus.Scheduled })
    const result = openPreparation(game)
    expect(result.status).toBe(GameStatus.PreparationOpen)
  })

  it("PreparationOpen -> PreparationLocked: lockPreparation", () => {
    const game = makeGame({ status: GameStatus.PreparationOpen })
    const result = lockPreparation(game)
    expect(result.status).toBe(GameStatus.PreparationLocked)
  })

  it("PreparationOpen -> Cancelled: cancel", () => {
    const game = makeGame({ status: GameStatus.PreparationOpen })
    const result = cancel(game)
    expect(result.status).toBe(GameStatus.Cancelled)
  })

  it("PreparationLocked -> RoundSetup: prepareRound", () => {
    const game = makeGame({ status: GameStatus.PreparationLocked })
    const result = prepareRound(game)
    expect(result.status).toBe(GameStatus.RoundSetup)
  })

  it("RoundSetup -> RoundBriefing: startBriefing", () => {
    const game = makeGame({ status: GameStatus.RoundSetup })
    const result = startBriefing(game)
    expect(result.status).toBe(GameStatus.RoundBriefing)
  })

  it("RoundBriefing -> RoundActive: startRound", () => {
    const game = makeGame({ status: GameStatus.RoundBriefing })
    const result = startRound(game)
    expect(result.status).toBe(GameStatus.RoundActive)
  })

  it("RoundActive -> RoundClosing: closeRound", () => {
    const game = makeGame({ status: GameStatus.RoundActive })
    const result = closeRound(game)
    expect(result.status).toBe(GameStatus.RoundClosing)
  })

  it("RoundClosing -> Verification: computeProvisionalScores", () => {
    const game = makeGame({ status: GameStatus.RoundClosing })
    const result = computeProvisionalScores(game)
    expect(result.status).toBe(GameStatus.Verification)
  })

  it("Verification -> ResultsPublished: publishResults", () => {
    const game = makeGame({ status: GameStatus.Verification })
    const result = publishResults(game)
    expect(result.status).toBe(GameStatus.ResultsPublished)
  })

  it("Verification -> RoundSetup: requestCorrection", () => {
    const game = makeGame({ status: GameStatus.Verification })
    const result = requestCorrection(game)
    expect(result.status).toBe(GameStatus.RoundSetup)
  })

  it("ResultsPublished -> RoundSetup: prepareNextRound", () => {
    const game = makeGame({ status: GameStatus.ResultsPublished })
    const result = prepareNextRound(game)
    expect(result.status).toBe(GameStatus.RoundSetup)
  })

  it("ResultsPublished -> Completed: completeGame", () => {
    const game = makeGame({ status: GameStatus.ResultsPublished })
    const result = completeGame(game)
    expect(result.status).toBe(GameStatus.Completed)
  })
})

describe("pause/resume/fail/recover cycle", () => {
  it("RoundActive -> Suspended: pause", () => {
    const game = makeGame({ status: GameStatus.RoundActive })
    const result = pause(game)
    expect(result.status).toBe(GameStatus.Suspended)
  })

  it("Suspended -> RoundActive: resume", () => {
    const game = makeGame({ status: GameStatus.Suspended })
    const result = resume(game)
    expect(result.status).toBe(GameStatus.RoundActive)
  })

  it("Suspended -> Failed: fail", () => {
    const game = makeGame({ status: GameStatus.Suspended })
    const result = fail(game)
    expect(result.status).toBe(GameStatus.Failed)
  })

  it("Failed -> PreparationOpen: recover", () => {
    const game = makeGame({ status: GameStatus.Failed })
    const result = recover(game)
    expect(result.status).toBe(GameStatus.PreparationOpen)
  })
})

describe("cancel from multiple states", () => {
  it("can cancel from Draft", () => {
    const game = makeGame({ status: GameStatus.Draft })
    expect(cancel(game).status).toBe(GameStatus.Cancelled)
  })

  it("can cancel from Scheduled", () => {
    const game = makeGame({ status: GameStatus.Scheduled })
    expect(cancel(game).status).toBe(GameStatus.Cancelled)
  })

  it("cannot cancel from Completed", () => {
    const game = makeGame({ status: GameStatus.Completed })
    expect(() => cancel(game)).toThrow(InvalidTransitionError)
  })

  it("cannot cancel from Failed", () => {
    const game = makeGame({ status: GameStatus.Failed })
    expect(() => cancel(game)).toThrow(InvalidTransitionError)
  })
})

describe("forbidden transitions", () => {
  it("Scheduled -> RoundActive is impossible (no timer-driven start)", () => {
    const game = makeGame({ status: GameStatus.Scheduled })
    expect(() => startRound(game)).toThrow(InvalidTransitionError)
  })

  it("PreparationOpen -> RoundActive is impossible (no direct start)", () => {
    const game = makeGame({ status: GameStatus.PreparationOpen })
    expect(() => startRound(game)).toThrow(InvalidTransitionError)
  })

  it("RoundClosing -> ResultsPublished is impossible (needs verification)", () => {
    const game = makeGame({ status: GameStatus.RoundClosing })
    expect(() => publishResults(game)).toThrow(InvalidTransitionError)
  })
})

describe("immutability", () => {
  it("does not mutate the original game object", () => {
    const game = makeGame({ status: GameStatus.Draft })
    const originalStatus = game.status
    schedule(game)
    expect(game.status).toBe(originalStatus)
  })
})
