import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyById: vi.fn(),
    updatePartyStatus: vi.fn(),
  },
  participationRepository: {
    listParticipationsByParty: vi.fn(),
    findParticipation: vi.fn(),
    updateParticipationStatusReadiness: vi.fn(),
    updateParticipation: vi.fn(),
  },
  announcementRepository: {
    createAnnouncement: vi.fn(),
    findAnnouncementsByParty: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("@session-jeu/game-engine", () => ({
  GameStatus: {
    Scheduled: "Scheduled",
    PreparationOpen: "PreparationOpen",
  },
  ParticipationStatus: {
    UNSPECIFIED: "UNSPECIFIED",
    Invited: "Invited",
    Registered: "Registered",
    Paid: "Paid",
    Present: "Present",
    Ready: "Ready",
  },
  openPreparation: vi.fn(),
  lockPreparation: vi.fn(),
  checkIn: vi.fn(),
  markReady: vi.fn(),
  InvalidTransitionError: class InvalidTransitionError extends Error {
    constructor(from: string, to: string) {
      super(`Transition from ${from} to ${to} is not allowed`);
      this.name = "InvalidTransitionError";
    }
  },
}));

const {
  confirmStart,
  openPreparation,
  markPresent,
  markReady,
  leavePreparation,
  sendPreparationAnnouncement,
} = await import("../preparation.use-case.js");

const baseParty = {
  id: "party-1",
  code: "PARTY",
  name: "Party",
  status: "PREPARATION_OPEN",
  scheduledAt: null,
  visibility: "public",
  minPlayers: 2,
  maxPlayers: 8,
  roundProgram: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.partyRepository.findPartyById.mockResolvedValue({ ...baseParty });
});

describe("openPreparation", () => {
  it("is admin-driven and does not auto-start a round (SCHEDULED → PREPARATION_OPEN)", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValueOnce({
      ...baseParty,
      status: "SCHEDULED",
    });
    dbMocks.partyRepository.updatePartyStatus.mockResolvedValueOnce({ status: "PREPARATION_OPEN" });

    await expect(openPreparation({ partyId: "party-1", userId: "admin-1" })).resolves.toEqual({
      status: "PREPARATION_OPEN",
    });
    expect(dbMocks.partyRepository.updatePartyStatus).toHaveBeenCalledWith(
      "party-1",
      "PREPARATION_OPEN",
    );
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PREPARATION_OPEN" }),
    );
  });

  it("is idempotent when preparation is already open", async () => {
    await expect(openPreparation({ partyId: "party-1", userId: "admin-1" })).resolves.toEqual({
      status: "PREPARATION_OPEN",
    });
    expect(dbMocks.partyRepository.updatePartyStatus).not.toHaveBeenCalled();
  });
});

describe("markPresent / markReady / leave — distinct and idempotent", () => {
  it("marks present from PAID", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "p1",
      partyId: "party-1",
      userId: "u1",
      role: "player",
      status: "PAID",
      readinessState: "offline",
      connectionState: "disconnected",
    });
    dbMocks.participationRepository.updateParticipationStatusReadiness.mockResolvedValueOnce({
      id: "p1",
      status: "PRESENT",
      readinessState: "present",
    });

    await expect(markPresent({ partyId: "party-1", userId: "u1" })).resolves.toEqual({
      id: "p1",
      status: "PRESENT",
      readinessState: "present",
    });
  });

  it("present is idempotent when already PRESENT", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "p1",
      partyId: "party-1",
      userId: "u1",
      role: "player",
      status: "PRESENT",
      readinessState: "present",
      connectionState: "connected",
    });

    await expect(markPresent({ partyId: "party-1", userId: "u1" })).resolves.toMatchObject({
      status: "PRESENT",
    });
    expect(dbMocks.participationRepository.updateParticipationStatusReadiness).not.toHaveBeenCalled();
  });

  it("ready requires present first", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "p1",
      partyId: "party-1",
      userId: "u1",
      role: "player",
      status: "PAID",
      readinessState: "offline",
      connectionState: "disconnected",
    });

    await expect(markReady({ partyId: "party-1", userId: "u1" })).rejects.toMatchObject({
      code: "NOT_PRESENT",
      httpStatus: 422,
    });
  });

  it("ready is idempotent when already READY", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "p1",
      partyId: "party-1",
      userId: "u1",
      role: "player",
      status: "READY",
      readinessState: "ready",
      connectionState: "connected",
    });

    await expect(markReady({ partyId: "party-1", userId: "u1" })).resolves.toMatchObject({
      status: "READY",
    });
    expect(dbMocks.participationRepository.updateParticipationStatusReadiness).not.toHaveBeenCalled();
  });

  it("leave is distinct and idempotent when already offline", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "p1",
      partyId: "party-1",
      userId: "u1",
      role: "player",
      status: "REGISTERED",
      readinessState: "offline",
      connectionState: "disconnected",
    });

    await expect(leavePreparation({ partyId: "party-1", userId: "u1" })).resolves.toEqual({
      status: "REGISTERED",
    });
    expect(dbMocks.participationRepository.updateParticipation).not.toHaveBeenCalled();
  });
});

describe("confirmStart", () => {
  it("requires a reason before locking preparation with absent participants", async () => {
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValueOnce([
      { id: "p1", status: "READY" },
      { id: "p2", status: "REGISTERED" },
    ]);

    await expect(
      confirmStart({
        partyId: "party-1",
        userId: "admin-1",
        forceWithAbsents: true,
      }),
    ).rejects.toMatchObject({
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

    await expect(
      confirmStart({
        partyId: "party-1",
        userId: "admin-1",
        forceWithAbsents: true,
        overrideReason: "Le joueur a confirme son absence par support.",
      }),
    ).resolves.toEqual({
      status: "PREPARATION_LOCKED",
      overriddenAbsents: 1,
    });
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CONFIRM_START",
        metadata: expect.objectContaining({
          overriddenAbsents: 1,
          overrideReason: "Le joueur a confirme son absence par support.",
        }),
      }),
    );
  });

  it("never transitions to ACTIVE_ROUND", async () => {
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValueOnce([
      { id: "p1", status: "READY" },
    ]);
    dbMocks.partyRepository.updatePartyStatus.mockResolvedValueOnce({ status: "PREPARATION_LOCKED" });

    const result = await confirmStart({ partyId: "party-1", userId: "admin-1" });
    expect(result.status).toBe("PREPARATION_LOCKED");
    expect(dbMocks.partyRepository.updatePartyStatus).toHaveBeenCalledWith(
      "party-1",
      "PREPARATION_LOCKED",
    );
  });
});

describe("sendPreparationAnnouncement", () => {
  it("creates Announcement + AuditLog + NotificationJob atomically", async () => {
    const tx = {
      announcement: {
        create: vi.fn().mockResolvedValue({ id: "ann-1", title: "Hi", body: "Body" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({ id: "aud-1" }) },
      notificationJob: {
        create: vi.fn().mockResolvedValue({ id: "job-1", status: "PENDING" }),
      },
    };
    dbMocks.prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));

    await expect(
      sendPreparationAnnouncement({
        partyId: "party-1",
        userId: "admin-1",
        title: "Hi",
        body: "Body",
      }),
    ).resolves.toEqual({ id: "ann-1", notificationJobId: "job-1" });

    expect(tx.announcement.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ANNOUNCEMENT_SEND", entityId: "ann-1" }),
      }),
    );
    expect(tx.notificationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PREPARATION_ANNOUNCEMENT",
          status: "PENDING",
          userId: "admin-1",
        }),
      }),
    );
  });

  it("does not partially persist when transaction fails", async () => {
    dbMocks.prisma.$transaction.mockRejectedValueOnce(new Error("db down"));

    await expect(
      sendPreparationAnnouncement({
        partyId: "party-1",
        userId: "admin-1",
        title: "Hi",
        body: "Body",
      }),
    ).rejects.toMatchObject({ code: "ANNOUNCEMENT_PERSIST_FAILED", httpStatus: 500 });
  });
});
