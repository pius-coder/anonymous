import { describe, it, expect } from "vitest"
import { GameStatus, createGame } from "../types/party.js"
import { ParticipationStatus, createParticipation, computeReadinessStats } from "../types/participation.js"
import { confirmStart, openPreparation, schedule } from "../transitions/party.js"
import { InvalidTransitionError } from "../errors.js"

describe("computeReadinessStats", () => {
  it("returns all zeros for empty list", () => {
    const stats = computeReadinessStats([])
    expect(stats).toEqual({ total: 0, present: 0, ready: 0, noResponse: 0, absent: 0 })
  })

  it("counts ready participants correctly", () => {
    const p1 = createParticipation({ id: "p1", gameId: "g1", userId: "u1" })
    const p2 = createParticipation({ id: "p2", gameId: "g1", userId: "u2" })
    const p3 = createParticipation({ id: "p3", gameId: "g1", userId: "u3" })

    p1.status = ParticipationStatus.Ready
    p2.status = ParticipationStatus.Ready
    p3.status = ParticipationStatus.Present

    const stats = computeReadinessStats([p1, p2, p3])
    expect(stats.total).toBe(3)
    expect(stats.ready).toBe(2)
    expect(stats.present).toBe(1)
  })

  it("counts absent (abandoned) participants", () => {
    const p1 = createParticipation({ id: "p1", gameId: "g1", userId: "u1" })
    const p2 = createParticipation({ id: "p2", gameId: "g1", userId: "u2" })
    p1.status = ParticipationStatus.Ready
    p2.status = ParticipationStatus.Abandoned

    const stats = computeReadinessStats([p1, p2])
    expect(stats.total).toBe(2)
    expect(stats.ready).toBe(1)
    expect(stats.absent).toBe(1)
  })

  it("counts noResponse based on readinessState", () => {
    const p1 = createParticipation({ id: "p1", gameId: "g1", userId: "u1" })
    p1.readinessState = "noResponse"

    const stats = computeReadinessStats([p1])
    expect(stats.total).toBe(1)
    expect(stats.noResponse).toBe(1)
  })
})

describe("confirmStart transition", () => {
  it("transitions from PREPARATION_OPEN to PREPARATION_LOCKED", () => {
    const game = createGame({ id: "g1", code: "TEST", name: "Test" })
    const scheduled = schedule(game)
    const opened = openPreparation(scheduled)
    const confirmed = confirmStart(opened)

    expect(confirmed.status).toBe(GameStatus.PreparationLocked)
  })

  it("throws error if game is not in PREPARATION_OPEN", () => {
    const game = createGame({ id: "g1", code: "TEST", name: "Test" })
    const scheduled = schedule(game)

    expect(() => confirmStart(scheduled)).toThrow(InvalidTransitionError)
  })

  it("does not transition to ACTIVE_ROUND", () => {
    const game = createGame({ id: "g1", code: "TEST", name: "Test" })
    const scheduled = schedule(game)
    const opened = openPreparation(scheduled)
    const confirmed = confirmStart(opened)

    expect(confirmed.status).not.toBe(GameStatus.RoundActive)
    expect(confirmed.status).not.toBe(GameStatus.RoundBriefing)
    expect(confirmed.status).not.toBe(GameStatus.RoundSetup)
  })
})
