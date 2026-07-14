import { describe, expect, it } from "vitest"
import { canRegister, registerParticipant, ParticipationStatus } from "../types/participation.js"
import type { Game } from "../types/party.js"

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "g-1",
    code: "TEST",
    name: "Test Party",
    status: 1 as never,
    scheduledAt: null,
    visibility: "public",
    minPlayers: 2,
    maxPlayers: 10,
    roundProgram: null,
    ...overrides,
  }
}

describe("canRegister", () => {
  it("allows registration when under maxPlayers", () => {
    const game = makeGame({ maxPlayers: 10 })
    expect(canRegister(game, 5)).toEqual({ allowed: true })
  })

  it("allows registration when exactly at maxPlayers - 1", () => {
    const game = makeGame({ maxPlayers: 10 })
    expect(canRegister(game, 9)).toEqual({ allowed: true })
  })

  it("denies registration when at maxPlayers", () => {
    const game = makeGame({ maxPlayers: 10 })
    expect(canRegister(game, 10)).toEqual({ allowed: false, reason: "PARTY_FULL" })
  })

  it("denies registration when over maxPlayers", () => {
    const game = makeGame({ maxPlayers: 10 })
    expect(canRegister(game, 15)).toEqual({ allowed: false, reason: "PARTY_FULL" })
  })

  it("allows registration when maxPlayers is null (unlimited)", () => {
    const game = makeGame({ maxPlayers: null })
    expect(canRegister(game, 100)).toEqual({ allowed: true })
  })

  it("allows registration when maxPlayers is 0 (unset)", () => {
    const game = makeGame({ maxPlayers: 0 })
    expect(canRegister(game, 50)).toEqual({ allowed: true })
  })
})

describe("registerParticipant", () => {
  it("creates participation in Registered status", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.status).toBe(ParticipationStatus.Registered)
  })

  it("sets role to player by default", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.role).toBe("player")
  })

  it("accepts custom role", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1", role: "readObserver" })
    expect(p.role).toBe("readObserver")
  })

  it("sets gameId and userId correctly", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.gameId).toBe("g-1")
    expect(p.userId).toBe("u-1")
  })

  it("initializes readinessState to offline", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.readinessState).toBe("offline")
  })

  it("initializes connectionState to disconnected", () => {
    const p = registerParticipant({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.connectionState).toBe("disconnected")
  })
})
