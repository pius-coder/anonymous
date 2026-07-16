/**
 * L5 flow (application layer): admin verifies/publishes → player sees results only after.
 * Transport mount is SEQ-03; this proves use-case acceptance without central router.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  scoreRepository: {
    listProvisionalScoresByRound: vi.fn(),
    findProvisionalScoreByRound: vi.fn(),
    createScoreReviewAndUpdateProvisional: vi.fn(),
    listPublishedScoresByRound: vi.fn(),
    publishRoundScores: vi.fn(),
  },
  roundRepository: {
    findRoundById: vi.fn(),
    listRoundsByParty: vi.fn(),
    updateRoundStatus: vi.fn(),
  },
  partyRepository: {
    findPartyById: vi.fn(),
    updatePartyStatus: vi.fn(),
  },
  participationRepository: {
    listParticipationsByParty: vi.fn(),
    findParticipation: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  correctProvisionalScore,
  getPublishedResults,
  listProvisionalScores,
  publishResults,
} = await import("../scoring.use-case.js");

describe("L5 admin publish then player results", () => {
  const round = {
    id: "round-1",
    partyId: "party-1",
    number: 1,
    minigame: "memory_sequence",
    status: "VERIFICATION",
  };
  const party = { id: "party-1", code: "P1", name: "P", status: "VERIFICATION" };
  const partA = { id: "part-a", partyId: "party-1", userId: "player-a", role: "PLAYER", status: "WAITING_REVIEW" };

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.roundRepository.findRoundById.mockResolvedValue(round);
    dbMocks.roundRepository.listRoundsByParty.mockResolvedValue([round]);
    dbMocks.roundRepository.updateRoundStatus.mockResolvedValue({ ...round, status: "PUBLISHED" });
    dbMocks.partyRepository.findPartyById.mockResolvedValue(party);
    dbMocks.partyRepository.updatePartyStatus.mockResolvedValue({
      ...party,
      status: "RESULTS_PUBLISHED",
    });
    dbMocks.participationRepository.listParticipationsByParty.mockResolvedValue([partA]);
    dbMocks.participationRepository.findParticipation.mockResolvedValue(partA);
    dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
  });

  it("player waiting before publication; results after admin correct+publish", async () => {
    // 1) Before: player sees waiting, empty scores
    dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue([]);
    const waiting = await getPublishedResults("party-1", "player");
    expect(waiting.waitingVerification).toBe(true);
    expect(waiting.scores).toEqual([]);

    // 2) Admin lists provisional (not exposed to player path)
    const provisional = {
      id: "prov-a",
      roundId: "round-1",
      participationId: "part-a",
      score: 10,
      rank: null,
      status: "PROVISIONAL",
      evidence: { source: "server" },
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    dbMocks.scoreRepository.listProvisionalScoresByRound.mockResolvedValue([provisional]);
    const adminList = await listProvisionalScores("round-1");
    expect(adminList.scores[0]?.score).toBe(10);
    expect(adminList.audience).toBe("admin");

    // 3) Admin corrects
    dbMocks.scoreRepository.findProvisionalScoreByRound.mockResolvedValue(provisional);
    dbMocks.scoreRepository.createScoreReviewAndUpdateProvisional.mockResolvedValue({
      review: { id: "rev-1" },
      provisional: {
        ...provisional,
        score: 11,
        status: "VERIFIED",
        updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      },
    });
    await correctProvisionalScore({
      roundId: "round-1",
      playerId: "player-a",
      correctedScore: 11,
      reason: "Evidence review accepted adjusted score",
      actorId: "admin-1",
      expectedVersion: provisional.updatedAt.toISOString(),
    });

    // 4) Admin publishes
    const verified = { ...provisional, score: 11, status: "VERIFIED" };
    dbMocks.scoreRepository.listProvisionalScoresByRound.mockResolvedValue([verified]);
    const publishedRow = {
      id: "pub-a",
      provisionalScoreId: "prov-a",
      roundId: "round-1",
      participationId: "part-a",
      score: 11,
      rank: 1,
      publishedBy: "admin-1",
      publishedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    dbMocks.scoreRepository.listPublishedScoresByRound
      .mockResolvedValueOnce([]) // pre-check in publish
      .mockResolvedValue([publishedRow]); // player get after
    dbMocks.scoreRepository.publishRoundScores.mockResolvedValue({
      alreadyPublished: false,
      published: [publishedRow],
    });

    const published = await publishResults({
      roundId: "round-1",
      partyId: "party-1",
      actorId: "admin-1",
    });
    expect(published.alreadyPublished).toBe(false);
    expect(published.publishedCount).toBe(1);

    // 5) Player now sees official results only
    const playerView = await getPublishedResults("party-1", "player");
    expect(playerView.waitingVerification).toBe(false);
    expect(playerView.scores).toHaveLength(1);
    expect(playerView.scores[0]?.score).toBe(11);
    expect(playerView.scores[0]?.rank).toBe(1);
    expect(JSON.stringify(playerView)).not.toMatch(/provisional/i);
  });
});
