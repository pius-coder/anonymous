import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyByCode: vi.fn(),
  },
  participationRepository: {
    findParticipation: vi.fn(),
    findParticipationByIdempotencyKey: vi.fn(),
    countByPartyId: vi.fn(),
    createParticipation: vi.fn(),
  },
  userRepository: {
    findUsersByIds: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const { registerForParty } = await import("../participation.use-case.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerForParty", () => {
  it("rejects public draft parties until they are published", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce({
      id: "party-1",
      code: "DRAFT",
      name: "Draft party",
      status: "DRAFT",
      visibility: "public",
      scheduledAt: null,
      minPlayers: 2,
      maxPlayers: 8,
      roundProgram: null,
    });

    await expect(registerForParty({
      code: "DRAFT",
      userId: "user-1",
      idempotencyKey: "register-1",
    })).rejects.toMatchObject({
      code: "PARTY_NOT_REGISTRABLE",
      httpStatus: 422,
    });
    expect(dbMocks.participationRepository.createParticipation).not.toHaveBeenCalled();
  });
});
