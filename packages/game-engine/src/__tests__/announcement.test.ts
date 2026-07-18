import { describe, it, expect } from "vitest"
import { createAnnouncement } from "../types/announcement.js"

describe("createAnnouncement", () => {
  it("creates an announcement with given params", () => {
    const a = createAnnouncement({
      id: "ann-1",
      partyId: "party-1",
      title: "Bienvenue",
      body: "La préparation commence",
      createdBy: "user-1",
    })

    expect(a.id).toBe("ann-1")
    expect(a.partyId).toBe("party-1")
    expect(a.title).toBe("Bienvenue")
    expect(a.body).toBe("La préparation commence")
    expect(a.createdBy).toBe("user-1")
    expect(a.createdAt).toBeInstanceOf(Date)
  })

  it("sets createdAt to current date", () => {
    const before = new Date()
    const a = createAnnouncement({
      id: "ann-2",
      partyId: "party-1",
      title: "Test",
      body: "Test body",
      createdBy: "user-1",
    })
    const after = new Date()

    expect(a.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(a.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it("allows empty body", () => {
    const a = createAnnouncement({
      id: "ann-3",
      partyId: "party-1",
      title: "Hello",
      body: "",
      createdBy: "user-1",
    })

    expect(a.body).toBe("")
  })
})
