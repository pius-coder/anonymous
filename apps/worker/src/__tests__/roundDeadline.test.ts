import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMetrics } from "../metrics.js";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    updatePartyStatus: vi.fn(),
  },
  participationRepository: {
    updateParticipationStatus: vi.fn(),
  },
  roundRepository: {
    listDueRoundDeadlines: vi.fn(),
    claimDueRoundDeadline: vi.fn(),
    updateRoundLifecycle: vi.fn(),
    updateRoundDeadline: vi.fn(),
    listRoundParticipants: vi.fn(),
    markRoundParticipantsWaitingReview: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const { closeDueRoundDeadlines } = await import("../jobs/roundDeadline.js");

beforeEach(() => {
  vi.clearAllMocks();
  resetMetrics();
  dbMocks.partyRepository.updatePartyStatus.mockResolvedValue({});
  dbMocks.participationRepository.updateParticipationStatus.mockResolvedValue({});
  dbMocks.roundRepository.claimDueRoundDeadline.mockResolvedValue(true);
  dbMocks.roundRepository.updateRoundLifecycle.mockResolvedValue({});
  dbMocks.roundRepository.updateRoundDeadline.mockResolvedValue({});
  dbMocks.roundRepository.listRoundParticipants.mockResolvedValue([
    { participationId: "participation-1" },
    { participationId: "participation-2" },
  ]);
  dbMocks.roundRepository.markRoundParticipantsWaitingReview.mockResolvedValue({ count: 2 });
});

describe("closeDueRoundDeadlines", () => {
  it("closes active due rounds to verification without publishing scores or starting party", async () => {
    const now = new Date("2026-01-01T00:02:00.000Z");
    dbMocks.roundRepository.listDueRoundDeadlines.mockResolvedValueOnce([
      {
        roundId: "round-1",
        round: { id: "round-1", partyId: "party-1", status: "ACTIVE" },
      },
    ]);

    const result = await closeDueRoundDeadlines(now);

    expect(result).toMatchObject({ closed: 1, skipped: 0, failed: 0 });
    expect(dbMocks.roundRepository.claimDueRoundDeadline).toHaveBeenCalledWith("round-1", now);
    expect(dbMocks.roundRepository.updateRoundLifecycle).toHaveBeenCalledWith("round-1", {
      status: "VERIFICATION",
    });
    expect(dbMocks.partyRepository.updatePartyStatus).toHaveBeenCalledWith(
      "party-1",
      "ROUND_VERIFICATION",
    );
    expect(dbMocks.partyRepository.updatePartyStatus).not.toHaveBeenCalledWith(
      expect.anything(),
      "ACTIVE",
    );
  });

  it("skips rounds that are no longer active", async () => {
    dbMocks.roundRepository.listDueRoundDeadlines.mockResolvedValueOnce([
      {
        roundId: "round-2",
        round: { id: "round-2", partyId: "party-1", status: "VERIFICATION" },
      },
    ]);

    await expect(closeDueRoundDeadlines()).resolves.toMatchObject({ closed: 0, skipped: 1 });
    expect(dbMocks.roundRepository.updateRoundLifecycle).not.toHaveBeenCalled();
  });

  it("does not close suspended rounds while the timer is frozen", async () => {
    dbMocks.roundRepository.listDueRoundDeadlines.mockResolvedValueOnce([
      {
        roundId: "round-3",
        round: { id: "round-3", partyId: "party-1", status: "SUSPENDED" },
      },
    ]);

    await expect(closeDueRoundDeadlines()).resolves.toMatchObject({ closed: 0, skipped: 1 });
    expect(dbMocks.roundRepository.claimDueRoundDeadline).not.toHaveBeenCalled();
  });

  it("skips deadlines already claimed by another worker", async () => {
    dbMocks.roundRepository.listDueRoundDeadlines.mockResolvedValueOnce([
      {
        roundId: "round-4",
        round: { id: "round-4", partyId: "party-1", status: "ACTIVE" },
      },
    ]);
    dbMocks.roundRepository.claimDueRoundDeadline.mockResolvedValueOnce(false);

    await expect(closeDueRoundDeadlines()).resolves.toMatchObject({ closed: 0, skipped: 1 });
    expect(dbMocks.roundRepository.updateRoundLifecycle).not.toHaveBeenCalled();
  });
});
