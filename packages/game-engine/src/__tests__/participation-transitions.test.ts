import { describe, expect, it } from "vitest"
import { ParticipationStatus, createParticipation } from "../types/participation.js"
import {
  canTransitionParticipation,
  acceptInvitation,
  confirmPayment,
  checkIn,
  markReady,
  connectRealtime,
  startRoundForPlayer,
  finishPlayerRound,
  disconnectPlayer,
  reconnectPlayer,
  abandonPlayer,
  closePlayerRound,
  publishPlayerResults,
  prepareNextRoundForPlayer,
  completePlayerParticipation,
  PARTICIPATION_TRANSITIONS,
} from "../transitions/participation.js"
import { InvalidTransitionError } from "../errors.js"

function makeParticipation(overrides: Partial<ReturnType<typeof createParticipation>> = {}) {
  return { ...createParticipation({ id: "p-1", gameId: "g-1", userId: "u-1" }), ...overrides }
}

describe("PARTICIPATION_TRANSITIONS", () => {
  it("defines valid transitions for every state", () => {
    const allStates = Object.values(ParticipationStatus).filter((v) => typeof v === "number") as ParticipationStatus[]
    for (const state of allStates) {
      expect(PARTICIPATION_TRANSITIONS[state]).toBeDefined()
    }
  })
})

describe("canTransitionParticipation", () => {
  it("returns true for Invited -> Registered", () => {
    expect(canTransitionParticipation(ParticipationStatus.Invited, ParticipationStatus.Registered)).toBe(true)
  })

  it("returns false for Invited -> Playing (skip steps)", () => {
    expect(canTransitionParticipation(ParticipationStatus.Invited, ParticipationStatus.Playing)).toBe(false)
  })

  it("returns false for Completed -> any (terminal)", () => {
    expect(canTransitionParticipation(ParticipationStatus.Completed, ParticipationStatus.Ready)).toBe(false)
  })
})

describe("participation lifecycle transitions", () => {
  it("Invited -> Registered: acceptInvitation", () => {
    const p = makeParticipation({ status: ParticipationStatus.Invited })
    expect(acceptInvitation(p).status).toBe(ParticipationStatus.Registered)
  })

  it("Registered -> Paid: confirmPayment", () => {
    const p = makeParticipation({ status: ParticipationStatus.Registered })
    expect(confirmPayment(p).status).toBe(ParticipationStatus.Paid)
  })

  it("Paid -> Present: checkIn", () => {
    const p = makeParticipation({ status: ParticipationStatus.Paid })
    expect(checkIn(p).status).toBe(ParticipationStatus.Present)
  })

  it("Present -> Ready: markReady", () => {
    const p = makeParticipation({ status: ParticipationStatus.Present })
    expect(markReady(p).status).toBe(ParticipationStatus.Ready)
  })

  it("Ready -> InRoom: connectRealtime", () => {
    const p = makeParticipation({ status: ParticipationStatus.Ready })
    expect(connectRealtime(p).status).toBe(ParticipationStatus.InRoom)
  })

  it("InRoom -> Playing: startRoundForPlayer", () => {
    const p = makeParticipation({ status: ParticipationStatus.InRoom })
    expect(startRoundForPlayer(p).status).toBe(ParticipationStatus.Playing)
  })

  it("Playing -> FinishedRound: finishPlayerRound", () => {
    const p = makeParticipation({ status: ParticipationStatus.Playing })
    expect(finishPlayerRound(p).status).toBe(ParticipationStatus.FinishedRound)
  })

  it("FinishedRound -> WaitingReview: closePlayerRound", () => {
    const p = makeParticipation({ status: ParticipationStatus.FinishedRound })
    expect(closePlayerRound(p).status).toBe(ParticipationStatus.WaitingReview)
  })

  it("WaitingReview -> ResultsVisible: publishPlayerResults", () => {
    const p = makeParticipation({ status: ParticipationStatus.WaitingReview })
    expect(publishPlayerResults(p).status).toBe(ParticipationStatus.ResultsVisible)
  })

  it("ResultsVisible -> Ready: prepareNextRoundForPlayer", () => {
    const p = makeParticipation({ status: ParticipationStatus.ResultsVisible })
    expect(prepareNextRoundForPlayer(p).status).toBe(ParticipationStatus.Ready)
  })

  it("ResultsVisible -> Completed: completePlayerParticipation", () => {
    const p = makeParticipation({ status: ParticipationStatus.ResultsVisible })
    expect(completePlayerParticipation(p).status).toBe(ParticipationStatus.Completed)
  })
})

describe("disconnect / reconnect / abandon cycle", () => {
  it("Playing -> Disconnected: disconnectPlayer", () => {
    const p = makeParticipation({ status: ParticipationStatus.Playing })
    expect(disconnectPlayer(p).status).toBe(ParticipationStatus.Disconnected)
  })

  it("Disconnected -> Playing: reconnectPlayer", () => {
    const p = makeParticipation({ status: ParticipationStatus.Disconnected })
    expect(reconnectPlayer(p).status).toBe(ParticipationStatus.Playing)
  })

  it("Disconnected -> Abandoned: abandonPlayer", () => {
    const p = makeParticipation({ status: ParticipationStatus.Disconnected })
    expect(abandonPlayer(p).status).toBe(ParticipationStatus.Abandoned)
  })
})

describe("invalid transitions throw", () => {
  it("throws when skipping from Invited to Playing", () => {
    const p = makeParticipation({ status: ParticipationStatus.Invited })
    expect(() => startRoundForPlayer(p)).toThrow(InvalidTransitionError)
  })

  it("throws when transitioning from Completed", () => {
    const p = makeParticipation({ status: ParticipationStatus.Completed })
    expect(() => markReady(p)).toThrow(InvalidTransitionError)
  })

  it("throws when transitioning from Abandoned", () => {
    const p = makeParticipation({ status: ParticipationStatus.Abandoned })
    expect(() => markReady(p)).toThrow(InvalidTransitionError)
  })
})

describe("immutability", () => {
  it("does not mutate the original participation object", () => {
    const p = makeParticipation({ status: ParticipationStatus.Ready })
    const originalStatus = p.status
    connectRealtime(p)
    expect(p.status).toBe(originalStatus)
  })
})
