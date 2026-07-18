import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyByCode: vi.fn(),
    findPartyById: vi.fn(),
  },
  participationRepository: {
    findParticipation: vi.fn(),
    findParticipationById: vi.fn(),
    tryRegisterWithCapacity: vi.fn(),
    cancelParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    listParticipationsByParty: vi.fn(),
    listParticipationsByUser: vi.fn(),
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
    paymentState: "NONE",
    admissionState: "PENDING",
    readinessState: "NOT_READY",
    connectionState: "OFFLINE",
    createdAt: new Date("2030-01-01T10:00:00.000Z"),
    expiresAt: new Date("2030-01-01T12:00:00.000Z"),
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.participationRepository.findParticipation.mockResolvedValue(null);
  dbMocks.participationRepository.tryRegisterWithCapacity.mockResolvedValue({
    ok: true,
    participation: participationRow(),
    created: true,
  });
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

    expect(dbMocks.participationRepository.tryRegisterWithCapacity).not.toHaveBeenCalled();
  });

  it("is idempotent when the repository returns an existing seat", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    const existing = participationRow();
    dbMocks.participationRepository.tryRegisterWithCapacity.mockResolvedValueOnce({
      ok: true,
      participation: existing,
      created: false,
    });

    const result = await registerForParty({
      code: "LIVE01",
      userId: "user-1",
      idempotencyKey: "register-dup",
    });

    expect(result.id).toBe("part-1");
    expect(dbMocks.participationRepository.tryRegisterWithCapacity).toHaveBeenCalledWith(
      expect.objectContaining({
        partyId: "party-1",
        userId: "user-1",
        idempotencyKey: "register-dup",
        expiresAt: scheduledParty.scheduledAt,
      }),
    );
  });

  it("rejects when the atomic capacity primitive reports full", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    dbMocks.participationRepository.tryRegisterWithCapacity.mockResolvedValueOnce({
      ok: false,
      reason: "CAPACITY_FULL",
    });

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

  it("returns the repository winner for an atomic concurrent claim", async () => {
    dbMocks.partyRepository.findPartyByCode.mockResolvedValueOnce(scheduledParty);
    const raced = participationRow({ id: "part-race" });
    dbMocks.participationRepository.tryRegisterWithCapacity.mockResolvedValueOnce({
      ok: true,
      participation: raced,
      created: false,
    });

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
