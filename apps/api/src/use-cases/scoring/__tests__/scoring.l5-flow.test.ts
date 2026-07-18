/**
 * L5 flow (application layer): admin corrects and publishes verified runtime evidence,
 * then player sees only the official published projection.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  scoreRepository: {
    listProvisionalScoresByRound: vi.fn(),
    listScoreVerificationRowsByRound: vi.fn(),
    findProvisionalScoreByRound: vi.fn(),
    createScoreReviewAndUpdateProvisional: vi.fn(),
    listPublishedScoresByRound: vi.fn(),
    publishRoundScoresWithGainsAndAudit: vi.fn(),
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
  paymentRepository: {
    findWalletByUserId: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  correctProvisionalScore,
  getPublishedResults,
  listProvisionalScores,
  publishResults,
} = await import("../scoring.use-case.js");

const round = {
  id: "round-1",
  partyId: "party-1",
  number: 1,
  minigame: "memory_sequence",
  status: "VERIFICATION",
};

const party = {
  id: "party-1",
  code: "P1",
  name: "Party",
  status: "VERIFICATION",
  entryFeeAmount: { toNumber: () => 500 },
};

const partA = {
  id: "part-a",
  partyId: "party-1",
  userId: "player-a",
  role: "PLAYER",
  status: "WAITING_REVIEW",
  paymentState: "PAID",
  paymentTransactionId: "pay-1",
};

function provisionalRow() {
  return {
    id: "prov-a",
    roundId: "round-1",
    participationId: "part-a",
    score: 10,
    rank: null,
    status: "PROVISIONAL",
    evidence: { source: "server" },
    evidenceHash: "hash-runtime-1",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function verifiedRow() {
  return {
    ...provisionalRow(),
    score: 11,
    status: "VERIFIED",
    updatedAt: new Date("2026-01-01T00:01:00.000Z"),
    evidence: {
      source: "server",
      inputRef: "input://runtime/round-1/player-a",
      configRef: "config://runtime/memory-sequence",
      seedRef: "seed://runtime/round-1",
      minigameVersion: "v1",
      sequenceLength: 8,
    },
    scoreEvidence: {
      id: "score-evidence-1",
      provisionalScoreId: "prov-a",
      evidenceHash: "hash-runtime-1",
      ciphertext: new Uint8Array([1, 2, 3]),
      nonce: null,
      keyId: "key-1",
      minigameVersion: "v1",
      classification: "SYSTEM_ONLY",
      purgedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    reviews: [],
    published: null,
    participation: {
      id: "part-a",
      userId: "player-a",
      paymentState: "PAID",
      paymentTransactionId: "pay-1",
      admissionState: "ADMITTED",
      user: {
        id: "player-a",
        name: "Player A",
        email: "player-a@example.test",
      },
    },
  };
}

describe("L5 admin publish then player results", () => {
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
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValue({ id: "wallet-a" });
  });

  it("keeps player waiting before publication, then exposes only published official results", async () => {
    dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue([]);

    const waiting = await getPublishedResults("party-1", "player");
    expect(waiting.waitingVerification).toBe(true);
    expect(waiting.scores).toEqual([]);

    dbMocks.scoreRepository.listProvisionalScoresByRound.mockResolvedValue([provisionalRow()]);
    const adminList = await listProvisionalScores("round-1");
    expect(adminList.audience).toBe("admin");
    expect(adminList.scores[0]?.score).toBe(10);

    dbMocks.scoreRepository.findProvisionalScoreByRound.mockResolvedValue(provisionalRow());
    dbMocks.scoreRepository.createScoreReviewAndUpdateProvisional.mockResolvedValue({
      review: { id: "rev-1" },
      provisional: {
        ...provisionalRow(),
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
      expectedVersion: provisionalRow().updatedAt.toISOString(),
    });

    const publishedRow = {
      id: "pub-a",
      provisionalScoreId: "prov-a",
      roundId: "round-1",
      participationId: "part-a",
      score: 11,
      rank: 1,
      evidenceHash: "hash-runtime-1",
      publishedBy: "admin-1",
      publishedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    dbMocks.scoreRepository.listScoreVerificationRowsByRound.mockResolvedValue([verifiedRow()]);
    dbMocks.scoreRepository.listPublishedScoresByRound
      .mockResolvedValueOnce([])
      .mockResolvedValue([publishedRow]);
    dbMocks.scoreRepository.publishRoundScoresWithGainsAndAudit.mockResolvedValue({
      alreadyPublished: false,
      published: [publishedRow],
      gains: [
        {
          id: "ledger-1",
          walletId: "wallet-a",
          transactionId: "tx-1",
          credit: 500,
        },
      ],
    });

    const published = await publishResults({
      roundId: "round-1",
      partyId: "party-1",
      actorId: "admin-1",
    });

    expect(published.alreadyPublished).toBe(false);
    expect(published.publishedCount).toBe(1);
    expect(dbMocks.scoreRepository.publishRoundScoresWithGainsAndAudit).toHaveBeenCalledWith({
      roundId: "round-1",
      publishedBy: "admin-1",
      correlationId: "publish:round-1:admin-1",
      provisionalStatus: "PUBLISHED",
      rows: [
        {
          provisionalScoreId: "prov-a",
          participationId: "part-a",
          score: 11,
          rank: 1,
          evidenceHash: "hash-runtime-1",
          prizeAmount: 500,
          walletId: "wallet-a",
          userId: "player-a",
        },
      ],
    });

    const playerView = await getPublishedResults("party-1", "player");
    expect(playerView.waitingVerification).toBe(false);
    expect(playerView.scores).toHaveLength(1);
    expect(playerView.scores[0]?.score).toBe(11);
    expect(playerView.scores[0]?.rank).toBe(1);
    expect(playerView.scores[0]?.publishedBy).toBe("admin-1");
    expect(JSON.stringify(playerView)).not.toMatch(/provisional|under_review|evidence/i);
  });
});
