import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyById: vi.fn(),
    updatePartyStatus: vi.fn(),
  },
  participationRepository: {
    listParticipationsByParty: vi.fn(),
    findParticipation: vi.fn(),
    updateParticipationStatus: vi.fn(),
  },
  roundRepository: {
    findRoundById: vi.fn(),
    findRoundByPartyNumber: vi.fn(),
    createRound: vi.fn(),
    updateRoundLifecycle: vi.fn(),
    createOrUpdateRoundDeadline: vi.fn(),
    updateRoundDeadline: vi.fn(),
    findRoundDeadlineByRoundId: vi.fn(),
    listRoundParticipants: vi.fn(),
    upsertRoundParticipantStatus: vi.fn(),
    markRoundParticipantsWaitingReview: vi.fn(),
    findPlayerActionByNonce: vi.fn(),
    createPlayerAction: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  activateRound,
  closeRound,
  configureRound,
  finishPlayerRound,
  pauseRound,
  resumeRound,
} = await import("../round.use-case.js");

const baseParty = {
  id: "party-1",
  code: "PARTY",
  name: "Party",
  status: "PREPARATION_LOCKED",
  scheduledAt: null,
  visibility: "public",
  minPlayers: 2,
  maxPlayers: 8,
  roundProgram: null,
};

const baseRound = {
  id: "round-1",
  partyId: "party-1",
  number: 1,
  minigame: "memory-sequence",
  status: "SETUP",
  startedAt: null,
  deadline: new Date(Date.now() + 60_000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.partyRepository.findPartyById.mockResolvedValue(baseParty);
  dbMocks.partyRepository.updatePartyStatus.mockResolvedValue({ ...baseParty, status: "ROUND_SETUP" });
  dbMocks.roundRepository.findRoundByPartyNumber.mockResolvedValue(null);
  dbMocks.roundRepository.createRound.mockResolvedValue(baseRound);
  dbMocks.roundRepository.findRoundById.mockResolvedValue(baseRound);
  dbMocks.roundRepository.updateRoundLifecycle.mockImplementation((_id, data) =>
    Promise.resolve({ ...baseRound, ...data }),
  );
  dbMocks.roundRepository.createOrUpdateRoundDeadline.mockResolvedValue({});
  dbMocks.roundRepository.updateRoundDeadline.mockResolvedValue({});
  dbMocks.roundRepository.findRoundDeadlineByRoundId.mockResolvedValue(null);
  dbMocks.roundRepository.listRoundParticipants.mockResolvedValue([]);
  dbMocks.roundRepository.upsertRoundParticipantStatus.mockResolvedValue({});
  dbMocks.roundRepository.findPlayerActionByNonce.mockResolvedValue(null);
  dbMocks.roundRepository.createPlayerAction.mockResolvedValue({});
  dbMocks.participationRepository.listParticipationsByParty.mockResolvedValue([]);
  dbMocks.participationRepository.findParticipation.mockResolvedValue({
    id: "participation-1",
    partyId: "party-1",
    userId: "user-1",
    role: "PLAYER",
    status: "PLAYING",
    readinessState: "ready",
    connectionState: "connected",
  });
  dbMocks.participationRepository.updateParticipationStatus.mockResolvedValue({});
  dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("round use-cases", () => {
  it("AC-10-01 rejects configure when party is not ready", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValueOnce({ ...baseParty, status: "SCHEDULED" });

    await expect(configureRound({
      partyId: "party-1",
      roundNumber: 1,
      minigameId: "memory-sequence",
      configuredBy: "admin-1",
    })).rejects.toMatchObject({ code: "ROUND_NOT_READY", httpStatus: 422 });
  });

  it("AC-10-01 configures a setup round with a deadline", async () => {
    await expect(configureRound({
      partyId: "party-1",
      roundNumber: 1,
      minigameId: "memory-sequence",
      configuredBy: "admin-1",
      durationSeconds: 90,
    })).resolves.toMatchObject({
      roundId: "round-1",
      status: "SETUP",
    });

    expect(dbMocks.roundRepository.createRound).toHaveBeenCalledWith(expect.objectContaining({
      partyId: "party-1",
      number: 1,
      minigame: "memory-sequence",
      status: "SETUP",
    }));
    expect(dbMocks.roundRepository.createOrUpdateRoundDeadline).toHaveBeenCalledWith(expect.objectContaining({
      roundId: "round-1",
      durationMs: 90_000,
    }));
  });

  it("AC-10-02 activates only from briefing and admits ready participants", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "BRIEFING" });
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValueOnce([
      { id: "p-ready", role: "PLAYER", status: "READY" },
      { id: "p-observer", role: "readObserver", status: "READY" },
      { id: "p-paid", role: "PLAYER", status: "PAID" },
    ]);

    await expect(activateRound({ roundId: "round-1", actorId: "admin-1" })).resolves.toMatchObject({
      status: "ACTIVE",
    });

    expect(dbMocks.roundRepository.upsertRoundParticipantStatus).toHaveBeenCalledWith("round-1", "p-ready", "PLAYING");
    expect(dbMocks.roundRepository.upsertRoundParticipantStatus).not.toHaveBeenCalledWith("round-1", "p-observer", "PLAYING");
    expect(dbMocks.roundRepository.upsertRoundParticipantStatus).not.toHaveBeenCalledWith("round-1", "p-paid", "PLAYING");
  });

  it("starts the active deadline from activation time, not configuration time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:10:00.000Z"));
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "BRIEFING", deadline: null });
    dbMocks.roundRepository.findRoundDeadlineByRoundId.mockResolvedValueOnce({
      roundId: "round-1",
      deadlineAt: null,
      durationMs: 90_000,
      pausedAt: null,
      remainingMs: null,
      closedAt: null,
    });

    await activateRound({ roundId: "round-1", actorId: "admin-1" });

    expect(dbMocks.roundRepository.updateRoundLifecycle).toHaveBeenCalledWith("round-1", expect.objectContaining({
      status: "ACTIVE",
      deadline: new Date("2026-01-01T00:11:30.000Z"),
    }));
    expect(dbMocks.roundRepository.updateRoundDeadline).toHaveBeenCalledWith("round-1", expect.objectContaining({
      deadlineAt: new Date("2026-01-01T00:11:30.000Z"),
    }));
  });

  it("AC-10-04 and AC-10-05 pauses and resumes the round", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "ACTIVE" });
    dbMocks.roundRepository.findRoundDeadlineByRoundId.mockResolvedValueOnce({
      roundId: "round-1",
      deadlineAt: new Date(Date.now() + 60_000),
      durationMs: 60_000,
      pausedAt: null,
      remainingMs: null,
      closedAt: null,
    });
    await expect(pauseRound({ roundId: "round-1", actorId: "admin-1", reason: "incident" })).resolves.toMatchObject({
      status: "SUSPENDED",
    });

    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "SUSPENDED" });
    dbMocks.roundRepository.findRoundDeadlineByRoundId.mockResolvedValueOnce({
      roundId: "round-1",
      deadlineAt: baseRound.deadline,
      durationMs: 60_000,
      pausedAt: new Date(),
      remainingMs: 60_000,
      closedAt: null,
    });
    await expect(resumeRound({ roundId: "round-1", actorId: "admin-1" })).resolves.toMatchObject({
      status: "ACTIVE",
    });
  });

  it("AC-10-06 closes to verification without publishing scores", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "ACTIVE" });
    dbMocks.roundRepository.listRoundParticipants.mockResolvedValueOnce([
      { participationId: "participation-1", finishedAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);

    await expect(closeRound({ roundId: "round-1", actorId: "admin-1", reason: "DEADLINE_REACHED" })).resolves.toMatchObject({
      status: "VERIFICATION",
    });

    expect(dbMocks.partyRepository.updatePartyStatus).toHaveBeenCalledWith("party-1", "ROUND_VERIFICATION");
    expect(dbMocks.participationRepository.updateParticipationStatus).toHaveBeenCalledWith("participation-1", "WAITING_REVIEW");
  });

  it("AC-10-03 marks an admitted active player as finished", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "ACTIVE" });
    dbMocks.roundRepository.listRoundParticipants.mockResolvedValueOnce([
      { participationId: "participation-1", status: "PLAYING" },
    ]);

    await expect(finishPlayerRound({
      roundId: "round-1",
      userId: "user-1",
      actionNonce: "nonce-1",
    })).resolves.toEqual({
      status: "FINISHED_ROUND",
      duplicate: false,
    });

    expect(dbMocks.roundRepository.createPlayerAction).toHaveBeenCalledWith(expect.objectContaining({
      accepted: true,
      actionNonce: "nonce-1",
    }));
  });

  it("AC-10-08 rejects late input with a stable code", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({
      ...baseRound,
      status: "VERIFICATION",
      deadline: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(finishPlayerRound({
      roundId: "round-1",
      userId: "user-1",
      actionNonce: "nonce-late",
    })).rejects.toMatchObject({ code: "LATE_INPUT", httpStatus: 422 });
    expect(dbMocks.roundRepository.createPlayerAction).toHaveBeenCalledWith(expect.objectContaining({
      accepted: false,
      rejectReason: "LATE_INPUT",
    }));
  });

  it("AC-10-09 rejects players who were not admitted after lock", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "ACTIVE" });
    dbMocks.roundRepository.listRoundParticipants.mockResolvedValueOnce([]);

    await expect(finishPlayerRound({
      roundId: "round-1",
      userId: "user-1",
      actionNonce: "nonce-no-show",
    })).rejects.toMatchObject({ code: "ROUND_PARTICIPANT_NOT_ADMITTED", httpStatus: 422 });
  });

  it("rejects non-player participations before recording a finish", async () => {
    dbMocks.roundRepository.findRoundById.mockResolvedValueOnce({ ...baseRound, status: "ACTIVE" });
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "participation-observer",
      partyId: "party-1",
      userId: "observer-1",
      role: "readObserver",
      status: "PLAYING",
      readinessState: "ready",
      connectionState: "connected",
    });

    await expect(finishPlayerRound({
      roundId: "round-1",
      userId: "observer-1",
      actionNonce: "nonce-observer",
    })).rejects.toMatchObject({ code: "ROUND_PARTICIPANT_NOT_ADMITTED", httpStatus: 422 });
    expect(dbMocks.roundRepository.createPlayerAction).not.toHaveBeenCalledWith(expect.objectContaining({
      participationId: "participation-observer",
      accepted: true,
    }));
  });
});
