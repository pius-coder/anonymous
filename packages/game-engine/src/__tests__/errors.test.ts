import { describe, expect, it } from "vitest"
import {
  DomainError,
  InvalidTransitionError,
  InvalidRoleError,
  ParticipationNotFoundError,
  ScoreNotPublishableError,
  GameNotFoundError,
} from "../errors.js"

describe("DomainError", () => {
  it("creates a base error with code and message", () => {
    const err = new DomainError("TEST_CODE", "test message")
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("DomainError")
    expect(err.code).toBe("TEST_CODE")
    expect(err.message).toBe("test message")
  })
})

describe("InvalidTransitionError", () => {
  it("creates error with stable code INVALID_TRANSITION", () => {
    const err = new InvalidTransitionError("Draft", "Cancelled")
    expect(err).toBeInstanceOf(DomainError)
    expect(err.code).toBe("INVALID_TRANSITION")
    expect(err.message).toContain("Draft")
    expect(err.message).toContain("Cancelled")
  })
})

describe("InvalidRoleError", () => {
  it("creates error with stable code INVALID_ROLE", () => {
    const err = new InvalidRoleError("player", "startRound")
    expect(err.code).toBe("INVALID_ROLE")
    expect(err.message).toContain("player")
    expect(err.message).toContain("startRound")
  })
})

describe("ParticipationNotFoundError", () => {
  it("creates error with stable code PARTICIPATION_NOT_FOUND", () => {
    const err = new ParticipationNotFoundError("part-123")
    expect(err.code).toBe("PARTICIPATION_NOT_FOUND")
    expect(err.message).toContain("part-123")
  })
})

describe("ScoreNotPublishableError", () => {
  it("creates error with stable code SCORE_NOT_PUBLISHABLE", () => {
    const err = new ScoreNotPublishableError("Pending")
    expect(err.code).toBe("SCORE_NOT_PUBLISHABLE")
    expect(err.message).toContain("Pending")
  })
})

describe("GameNotFoundError", () => {
  it("creates error with stable code GAME_NOT_FOUND", () => {
    const err = new GameNotFoundError("game-123")
    expect(err.code).toBe("GAME_NOT_FOUND")
    expect(err.message).toContain("game-123")
  })
})
