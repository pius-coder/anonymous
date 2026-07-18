import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  scoreRepository: {
    listProvisionalScoresByRound: vi.fn(),
    listScoreVerificationRowsByRound: vi.fn(),
    listPrizeLedgerEntriesByRound: vi.fn(),
    findProvisionalScoreByRound: vi.fn(),
    createScoreReviewAndUpdateProvisional: vi.fn(),
    listPublishedScoresByRound: vi.fn(),
    publishRoundScores: vi.fn(),
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
  ScoringUseCaseError,
  correctProvisionalScore,
  getAdminScoreVerificationDossier,
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
  code: "SEED-01",
  name: "Party",
  status: "VERIFICATION",
  entryFeeAmount: { toNumber: () => 500 },
};

const partA = {
  id: "part-a",
  partyId: "party-1",
  userId: "user-a",
  role: "PLAYER",
  status: "WAITING_REVIEW",
};
const partB = {
  id: "part-b",
  partyId: "party-1",
  userId: "user-b",
  role: "PLAYER",
  status: "WAITING_REVIEW",
};

function provisionalRow(
  overrides: Partial<{
    id: string;
    participationId: string;
    score: number;
    status: string;
    updatedAt: Date;
    rank: number | null;
  }> = {},
) {
  return {
    id: overrides.id ?? "prov-a",
    roundId: "round-1",
    participationId: overrides.participationId ?? "part-a",
    score: overrides.score ?? 10,
    rank: overrides.rank ?? null,
    status: overrides.status ?? "PROVISIONAL",
      evidence: { source: "test" },
      evidenceHash: "hash-test",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    };
}

function verificationRow(
  overrides: Partial<{
    id: string;
    participationId: string;
    score: number;
    status: string;
    updatedAt: Date;
    rank: number | null;
    evidence: Record<string, unknown>;
    evidenceHash: string;
    minigameVersion: string | null;
  }> = {},
) {
  return {
    ...provisionalRow(overrides),
    evidence:
      overrides.evidence ?? {
        source: "test",
        inputRef: "input://test",
        configRef: "config://test",
        seedRef: "seed://test",
        minigameVersion: "v1",
      },
    evidenceHash: overrides.evidenceHash ?? "hash-test",
    scoreEvidence: {
      id: "sev-1",
      provisionalScoreId: overrides.id ?? "prov-a",
      evidenceHash: overrides.evidenceHash ?? "hash-test",
      ciphertext: new Uint8Array([1, 2, 3]),
      nonce: null,
      keyId: "key-1",
      minigameVersion: overrides.minigameVersion ?? "v1",
      classification: "SYSTEM_ONLY",
      purgedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    reviews: [],
    published: null,
    participation: {
      id: overrides.participationId ?? "part-a",
      userId: overrides.participationId === "part-b" ? "user-b" : "user-a",
      paymentState: "PAID",
      admissionState: "ADMITTED",
      paymentTransactionId: "pay-1",
      user: {
        id: overrides.participationId === "part-b" ? "user-b" : "user-a",
        name: overrides.participationId === "part-b" ? "Player B" : "Player A",
        email: overrides.participationId === "part-b" ? "b@example.test" : "a@example.test",
      },
    },
  };
}

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
  dbMocks.participationRepository.listParticipationsByParty.mockResolvedValue([partA, partB]);
  dbMocks.participationRepository.findParticipation.mockImplementation(
    (_partyId: string, userId: string) =>
      Promise.resolve([partA, partB].find((p) => p.userId === userId) ?? null),
  );
  dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
  dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue([]);
  dbMocks.scoreRepository.listPrizeLedgerEntriesByRound.mockResolvedValue([]);
  dbMocks.paymentRepository.findWalletByUserId.mockResolvedValue({ id: "wallet-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listProvisionalScores (admin path)", () => {
  it("returns provisional scores with versions and no publish projection", async () => {
    dbMocks.scoreRepository.listProvisionalScoresByRound.mockResolvedValue([
      provisionalRow({ id: "prov-a", participationId: "part-a", score: 12, status: "PROVISIONAL" }),
      provisionalRow({ id: "prov-b", participationId: "part-b", score: 8, status: "UNDER_REVIEW" }),
    ]);

    const result = await listProvisionalScores("round-1");
    expect(result.audience).toBe("admin");
    expect(result.scores).toHaveLength(2);
    expect(result.scores[0]?.playerId).toBe("user-a");
    expect(result.scores[0]?.version).toBe("2026-01-01T00:00:00.000Z");
    expect(result.aggregateStatus).toBe("UNDER_REVIEW");
    expect(result.scores.every((s) => s.provisionalScoreId)).toBe(true);
  });
});

describe("correctProvisionalScore", () => {
  it("rejects missing audit reason", async () => {
    await expect(
      correctProvisionalScore({
        roundId: "round-1",
        playerId: "user-a",
        correctedScore: 11,
        reason: "   ",
        actorId: "admin-1",
      }),
    ).rejects.toMatchObject({ code: "AUDIT_REASON_REQUIRED", httpStatus: 400 });
  });

  it("corrects with actor, reason, version and audit", async () => {
    const row = provisionalRow({ status: "PROVISIONAL", score: 10 });
    dbMocks.scoreRepository.findProvisionalScoreByRound.mockResolvedValue(row);
    dbMocks.scoreRepository.createScoreReviewAndUpdateProvisional.mockResolvedValue({
      review: { id: "rev-1" },
      provisional: {
        ...row,
        score: 11,
        status: "VERIFIED",
        updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      },
    });

    const result = await correctProvisionalScore({
      roundId: "round-1",
      playerId: "user-a",
      correctedScore: 11,
      reason: "Late input discarded after evidence review",
      actorId: "admin-1",
      expectedVersion: row.updatedAt.toISOString(),
    });

    expect(result.previousScore).toBe(10);
    expect(result.correctedScore).toBe(11);
    expect(result.status).toBe("VERIFIED");
    expect(result.reviewId).toBe("rev-1");
    expect(dbMocks.scoreRepository.createScoreReviewAndUpdateProvisional).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewedBy: "admin-1",
        reason: "Late input discarded after evidence review",
        expectedUpdatedAt: row.updatedAt,
        provisionalStatus: "VERIFIED",
      }),
    );
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SCORE_CORRECT", userId: "admin-1" }),
    );
  });

  it("maps version conflict deterministically", async () => {
    const row = provisionalRow({ status: "PROVISIONAL" });
    dbMocks.scoreRepository.findProvisionalScoreByRound.mockResolvedValue(row);
    dbMocks.scoreRepository.createScoreReviewAndUpdateProvisional.mockRejectedValue(
      new Error("PROVISIONAL_SCORE_VERSION_CONFLICT"),
    );

    await expect(
      correctProvisionalScore({
        roundId: "round-1",
        playerId: "user-a",
        correctedScore: 9,
        reason: "Concurrent correction attempt",
        actorId: "admin-2",
        expectedVersion: row.updatedAt.toISOString(),
      }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT", httpStatus: 409 });
  });
});

describe("getPublishedResults (no provisional leak)", () => {
  it("returns waiting state without scores before publication", async () => {
    dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue([]);
    const result = await getPublishedResults("party-1", "player");
    expect(result.waitingVerification).toBe(true);
    expect(result.scores).toEqual([]);
    expect(result.audience).toBe("player");
  });

  it("returns published projection only after publication", async () => {
    dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue([
      {
        id: "pub-1",
        provisionalScoreId: "prov-a",
        roundId: "round-1",
        participationId: "part-a",
        score: 12,
        rank: 1,
        publishedBy: "admin-1",
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const result = await getPublishedResults("party-1", "observer");
    expect(result.waitingVerification).toBe(false);
    expect(result.scores).toHaveLength(1);
    expect(result.scores[0]?.score).toBe(12);
    expect(result.scores[0]?.rank).toBe(1);
    expect(result.audience).toBe("observer");
    // Ensure shape has no provisional fields
    expect(JSON.stringify(result)).not.toMatch(/provisional/i);
  });
});

describe("getAdminScoreVerificationDossier", () => {
  it("returns evidence validation and gain metrics for admin dossier", async () => {
    dbMocks.scoreRepository.listScoreVerificationRowsByRound.mockResolvedValue([
      verificationRow(),
    ]);
    dbMocks.scoreRepository.listPrizeLedgerEntriesByRound.mockResolvedValue([
      {
        id: "ledger-1",
        transactionId: "tx-1",
        walletId: "wallet-1",
        credit: 500,
        transaction: { userId: "user-a", walletId: "wallet-1" },
      },
    ]);

    const dossier = await getAdminScoreVerificationDossier("party-1", "round-1");
    expect(dossier.rows[0]?.evidence.validationStatus).toBe("VALID");
    expect(dossier.rows[0]?.gainPreview.credited).toBe(true);
    expect(dossier.metrics.creditedGainTotal).toBe(500);
  });
});

describe("publishResults", () => {
  it("rejects when scores are not verified", async () => {
    dbMocks.scoreRepository.listScoreVerificationRowsByRound.mockResolvedValue([
      verificationRow({ status: "PROVISIONAL" }),
    ]);

    await expect(
      publishResults({ roundId: "round-1", partyId: "party-1", actorId: "admin-1" }),
    ).rejects.toMatchObject({ code: "SCORE_NOT_VERIFIED" });
  });

  it("rejects when runtime evidence is missing or mismatched", async () => {
    dbMocks.scoreRepository.listScoreVerificationRowsByRound.mockResolvedValue([
      verificationRow({
        status: "VERIFIED",
        evidenceHash: "",
        minigameVersion: null,
      }),
    ]);

    await expect(
      publishResults({ roundId: "round-1", partyId: "party-1", actorId: "admin-1" }),
    ).rejects.toMatchObject({ code: "EVIDENCE_HASH_EMPTY" });
  });

  it("publishes verified scores and is idempotent on second call", async () => {
    const verified = [
      verificationRow({ id: "prov-a", participationId: "part-a", score: 12, status: "VERIFIED" }),
      verificationRow({ id: "prov-b", participationId: "part-b", score: 8, status: "VERIFIED" }),
    ];
    dbMocks.scoreRepository.listScoreVerificationRowsByRound.mockResolvedValue(verified);

    const publishedRows = [
      {
        id: "pub-a",
        provisionalScoreId: "prov-a",
        roundId: "round-1",
        participationId: "part-a",
        score: 12,
        rank: 1,
        publishedBy: "admin-1",
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "pub-b",
        provisionalScoreId: "prov-b",
        roundId: "round-1",
        participationId: "part-b",
        score: 8,
        rank: 2,
        publishedBy: "admin-1",
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ];

    dbMocks.scoreRepository.publishRoundScoresWithGainsAndAudit.mockResolvedValue({
      alreadyPublished: false,
      published: publishedRows,
      gains: [],
      auditLogId: "audit-1",
    });
    dbMocks.scoreRepository.listPublishedScoresByRound
      .mockResolvedValueOnce([]) // pre-check
      .mockResolvedValue(publishedRows); // getPublishedResults after

    const first = await publishResults({
      roundId: "round-1",
      partyId: "party-1",
      actorId: "admin-1",
    });
    expect(first.alreadyPublished).toBe(false);
    expect(first.publishedCount).toBe(2);
    expect(dbMocks.roundRepository.updateRoundStatus).toHaveBeenCalledWith("round-1", "PUBLISHED");
    expect(dbMocks.partyRepository.updatePartyStatus).toHaveBeenCalledWith(
      "party-1",
      "RESULTS_PUBLISHED",
    );
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RESULTS_PUBLISH" }),
    );
    expect(dbMocks.scoreRepository.publishRoundScoresWithGainsAndAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ prizeAmount: 1000 }),
        ]),
      }),
    );

    // Idempotent second call
    dbMocks.scoreRepository.listPublishedScoresByRound.mockResolvedValue(publishedRows);
    const second = await publishResults({
      roundId: "round-1",
      partyId: "party-1",
      actorId: "admin-2",
    });
    expect(second.alreadyPublished).toBe(true);
    expect(second.publishedCount).toBe(2);
  });

  it("raises typed error for missing reason path via ScoringUseCaseError shape", () => {
    const err = new ScoringUseCaseError("AUDIT_REASON_REQUIRED", "x", 400);
    expect(err.code).toBe("AUDIT_REASON_REQUIRED");
    expect(err.httpStatus).toBe(400);
  });
});
