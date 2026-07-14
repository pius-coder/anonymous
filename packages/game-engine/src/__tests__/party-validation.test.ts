import { describe, expect, it } from "vitest"
import { validateGameConfig, InvalidConfigError } from "../index.js"

describe("validateGameConfig", () => {
  it("returns no issues for a valid config", () => {
    const issues = validateGameConfig({
      name: "My Party",
      visibility: "public",
      minPlayers: 2,
      maxPlayers: 10,
    })
    expect(issues).toHaveLength(0)
  })

  it("returns NAME_REQUIRED when name is empty", () => {
    const issues = validateGameConfig({ name: "", visibility: "public" })
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe("NAME_REQUIRED")
  })

  it("returns NAME_REQUIRED when name is only whitespace", () => {
    const issues = validateGameConfig({ name: "   ", visibility: "public" })
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe("NAME_REQUIRED")
  })

  it("returns MIN_PLAYERS_TOO_LOW when minPlayers < 2", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "public", minPlayers: 1 })
    expect(issues.some((i) => i.code === "MIN_PLAYERS_TOO_LOW")).toBe(true)
  })

  it("returns MAX_PLAYERS_TOO_LOW when maxPlayers < 2", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "public", maxPlayers: 1 })
    expect(issues.some((i) => i.code === "MAX_PLAYERS_TOO_LOW")).toBe(true)
  })

  it("returns MAX_LESS_THAN_MIN when maxPlayers < minPlayers", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "public", minPlayers: 10, maxPlayers: 5 })
    expect(issues.some((i) => i.code === "MAX_LESS_THAN_MIN")).toBe(true)
  })

  it("returns INVALID_VISIBILITY for unknown visibility", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "secret" })
    expect(issues.some((i) => i.code === "INVALID_VISIBILITY")).toBe(true)
  })

  it("returns multiple issues for compound invalid config", () => {
    const issues = validateGameConfig({ name: "", visibility: "secret", minPlayers: 0, maxPlayers: 0 })
    expect(issues.length).toBeGreaterThanOrEqual(3)
  })

  it("accepts 'private' visibility as valid", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "private" })
    expect(issues.some((i) => i.code === "INVALID_VISIBILITY")).toBe(false)
  })

  it("does not flag nullish min/max players", () => {
    const issues = validateGameConfig({ name: "Test", visibility: "public" })
    expect(issues.some((i) => i.code.startsWith("MIN_") || i.code.startsWith("MAX_"))).toBe(false)
  })
})

describe("InvalidConfigError", () => {
  it("creates error with stable code INVALID_CONFIG", () => {
    const err = new InvalidConfigError([{ field: "name", code: "NAME_REQUIRED", message: "Le nom est requis" }])
    expect(err.code).toBe("INVALID_CONFIG")
    expect(err.message).toContain("Le nom est requis")
  })
})
