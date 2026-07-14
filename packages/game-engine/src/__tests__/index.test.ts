import { describe, expect, it } from "vitest"
import {
  DomainError,
  GameStatus,
  createGame,
  ParticipationStatus,
  createParticipation,
  RoundStatus,
  createRound,
  ScoreStatus,
  canTransitionParty,
  schedule,
  openPreparation,
  PARTICIPATION_TRANSITIONS,
  SCORE_TRANSITIONS,
} from "../index.js"

describe("game-engine public API", () => {
  it("exports DomainError", () => {
    expect(DomainError).toBeDefined()
  })

  it("exports GameStatus enum", () => {
    expect(GameStatus.Draft).toBe(1)
    expect(GameStatus.Scheduled).toBe(2)
    expect(GameStatus.RoundActive).toBe(7)
    expect(GameStatus.Completed).toBe(11)
  })

  it("exports createGame", () => {
    const game = createGame({ id: "g-1", code: "GAME", name: "Test" })
    expect(game.status).toBe(GameStatus.Draft)
    expect(game.code).toBe("GAME")
  })

  it("exports ParticipationStatus", () => {
    expect(ParticipationStatus.Invited).toBe(1)
    expect(ParticipationStatus.Playing).toBe(7)
    expect(ParticipationStatus.Completed).toBe(12)
  })

  it("exports createParticipation", () => {
    const p = createParticipation({ id: "p-1", gameId: "g-1", userId: "u-1" })
    expect(p.status).toBe(ParticipationStatus.Invited)
    expect(p.role).toBe("player")
  })

  it("exports RoundStatus", () => {
    expect(RoundStatus.Active).toBe(3)
  })

  it("exports createRound", () => {
    const r = createRound({ id: "r-1", gameId: "g-1", number: 1, miniGameKey: "game-x" })
    expect(r.status).toBe(RoundStatus.Setup)
    expect(r.number).toBe(1)
  })

  it("exports ScoreStatus", () => {
    expect(ScoreStatus.Published).toBe(5)
  })

  it("exports party transition functions", () => {
    expect(canTransitionParty).toBeDefined()
    expect(schedule).toBeDefined()
    expect(openPreparation).toBeDefined()
  })

  it("exports transition maps", () => {
    expect(PARTICIPATION_TRANSITIONS).toBeDefined()
    expect(SCORE_TRANSITIONS).toBeDefined()
  })
})
