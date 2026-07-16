import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyByCode: vi.fn(),
    findPartyById: vi.fn(),
  },
  participationRepository: {
    findParticipation: vi.fn(),
    findParticipationById: vi.fn(),
    findParticipationByIdempotencyKey: vi.fn(),
    countByPartyId: vi.fn(),
    countActiveByPartyId: vi.fn(),
    createParticipation: vi.fn(),
    cancelParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    listParticipationsByParty: vi.fn(),
    updateParticipation: vi.fn(),
  },
  userRepository: {
    findUsersByIds: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  registerForParty,
  cancelMyParticipation,
  getParticipationById,
} = await import("../participation.use-case.js");

const scheduledParty = {
  id: "party-1",
  code: "LIVE01",
  name: "Live party",
  status: "SCHEDULED",
  visibility: "public",
  scheduledAt: new Date("2030-01-01T12:00:00.000Z"),
  minPlayers: 2,
  maxPlayers: 2,
  roundProgram: null,
};

function participationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "part-1",
    partyId: "party-1",
    userId: "user-1",
    role: "player",
    status: "REGISTERED",
    readinessState: "NOT_READY",
    connectionState: "OFFLINE",
    createdAt: new Date("2030-01-01T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.participationRepository.findParticipationByIdempotencyKey.mockResolvedValue(null);
  dbMocks.participationRepository.findParticipation.mockResolvedValue(null);
  dbMocks.participationRepository.countActiveByPartyId.mockResolvedValue(0);
});

describe("registerForParty", () => {
  it("rejects public draft parties until they are published", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce({
      ...scheduledParty,
      status: "DRAFT",
      code: "DRAFT",
    });

    await expect(
      registerForParty({
        code: "DRAFT",
        userId: "user-1",
        idempotencyKey: "register-1",
      }),
    ).rejects.toMatchObject({
      code: "PARTY_NOT_REGISTRABLE",
      httpStatus: 422,
    });
    expect(dbMocks.participationRepository.createParticipation).not.toHaveBeenCalled();
  });

  it("is idempotent when the user is already registered", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    const existing = participationRow();
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce(existing);

    const result = await registerForParty({
      code: "LIVE01",
      userId: "user-1",
      idempotencyKey: "register-dup",
    });

    expect(result.id).toBe("part-1");
    expect(dbMocks.participationRepository.createParticipation).not.toHaveBeenCalled();
  });

  it("rejects when active capacity is full", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    dbMocks.participationRepository.countActiveByPartyId.mockResolvedValueOnce(2);

    await expect(
      registerForParty({
        code: "LIVE01",
        userId: "user-2",
        idempotencyKey: "register-full",
      }),
    ).rejects.toMatchObject({
      code: "PARTY_FULL",
      httpStatus: 422,
    });
  });

  it("returns the same row on concurrent unique constraint race", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    dbMocks.participationRepository.createParticipation.mockRejectedValueOnce(
      new Error("Unique constraint failed"),
    );
    const raced = participationRow({ id: "part-race" });
    dbMocks.participationRepository.findParticipation
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced);

    const result = await registerForParty({
      code: "LIVE01",
      userId: "user-1",
      idempotencyKey: "register-race",
    });

    expect(result.id).toBe("part-race");
  });
});

describe("cancelMyParticipation", () => {
  it("is idempotent when already abandoned", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce(
      participationRow({ status: "ABANDONED" }),
    );

    const result = await cancelMyParticipation({ code: "LIVE01", userId: "user-1" });
    expect(result.status).toBe("ABANDONED");
    expect(dbMocks.participationRepository.cancelParticipation).not.toHaveBeenCalled();
  });

  it("cancels a registered participation", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce(participationRow());
    dbMocks.participationRepository.cancelParticipation.mockResolvedValueOnce(
      participationRow({ status: "ABANDONED" }),
    );

    const result = await cancelMyParticipation({ code: "LIVE01", userId: "user-1" });
    expect(result.status).toBe("ABANDONED");
    expect(dbMocks.participationRepository.cancelParticipation).toHaveBeenCalledWith(
      "part-1",
      "annulation par le joueur",
    );
  });
});

describe("getParticipationById RBAC", () => {
  it("forbids non-owner non-staff", async () => {
    dbMocks.participationRepository.findParticipationById.mockResolvedValueOnce(
      participationRow({ userId: "owner" }),
    );

    await expect(
      getParticipationById({
        participationId: "part-1",
        userId: "other",
        roles: ["PLAYER"],
      }),
    ).rejects.toMatchObject({ code: "PARTICIPATION_FORBIDDEN", httpStatus: 403 });
  });

  it("allows owner", async () => {
    dbMocks.participationRepository.findParticipationById.mockResolvedValueOnce(
      participationRow({ userId: "owner" }),
    );

    const result = await getParticipationById({
      participationId: "part-1",
      userId: "owner",
      roles: ["PLAYER"],
    });
    expect(result.userId).toBe("owner");
  });
});
