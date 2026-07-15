import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyById: vi.fn(),
    updatePartyStatus: vi.fn(),
  },
  participationRepository: {
    listParticipationsByParty: vi.fn(),
  },
  announcementRepository: {
    createAnnouncement: vi.fn(),
    findAnnouncementsByParty: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("@session-jeu/game-engine", () => ({
  GameStatus: {
    PreparationOpen: "PreparationOpen",
  },
  ParticipationStatus: {
    UNSPECIFIED: "UNSPECIFIED",
  },
  openPreparation: vi.fn(),
  lockPreparation: vi.fn(),
  checkIn: vi.fn(),
  markReady: vi.fn(),
}));

const { confirmStart } = await import("../preparation.use-case.js");

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.partyRepository.findPartyById.mockResolvedValue({
    id: "party-1",
    code: "PARTY",
    name: "Party",
    status: "PREPARATION_OPEN",
    scheduledAt: null,
    visibility: "public",
    minPlayers: 2,
    maxPlayers: 8,
    roundProgram: null,
  });
});

describe("confirmStart", () => {
  it("requires a reason before locking preparation with absent participants", async () => {
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValueOnce([
      { id: "p1", status: "READY" },
      { id: "p2", status: "REGISTERED" },
    ]);

    await expect(confirmStart({
      partyId: "party-1",
      userId: "admin-1",
      forceWithAbsents: true,
    })).rejects.toMatchObject({
      code: "ABSENT_CONFIRMATION_REQUIRED",
      httpStatus: 422,
    });
    expect(dbMocks.partyRepository.updatePartyStatus).not.toHaveBeenCalled();
    expect(dbMocks.auditRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it("locks preparation with absent participants only when a reason is supplied", async () => {
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValueOnce([
      { id: "p1", status: "READY" },
      { id: "p2", status: "PAID" },
    ]);
    dbMocks.partyRepository.updatePartyStatus.mockResolvedValueOnce({ status: "PREPARATION_LOCKED" });

    await expect(confirmStart({
      partyId: "party-1",
      userId: "admin-1",
      forceWithAbsents: true,
      overrideReason: "Le joueur a confirme son absence par support.",
    })).resolves.toEqual({
      status: "PREPARATION_LOCKED",
      overriddenAbsents: 1,
    });
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "CONFIRM_START",
      metadata: expect.objectContaining({
        overriddenAbsents: 1,
        overrideReason: "Le joueur a confirme son absence par support.",
      }),
    }));
  });
});
