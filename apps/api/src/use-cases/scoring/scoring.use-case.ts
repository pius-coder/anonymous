import {
  auditRepository,
  participationRepository,
  partyRepository,
  roundRepository,
  scoreRepository,
} from "@session-jeu/db";
import {
  ScoreStatus as DomainScoreStatus,
  type ScoreEntry,
  correctScore as domainCorrectScore,
  flagForReview,
  publishScore as domainPublishScore,
  setProvisional,
  verifyScore,
} from "@session-jeu/game-engine";

export class ScoringUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "ScoringUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Durable status strings stored on ProvisionalScore.status */
export type DurableScoreStatus =
  | "PENDING"
  | "PROVISIONAL"
  | "UNDER_REVIEW"
  | "CORRECTED"
  | "VERIFIED"
  | "PUBLISHED"
  | "VOIDED";

export type ProvisionalScoreView = {
  provisionalScoreId: string;
  roundId: string;
  participationId: string;
  playerId: string;
  playerName: string | null;
  score: number;
  rank: number | null;
  status: DurableScoreStatus;
  version: string;
  evidenceSummary: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type PublishedScoreView = {
  roundId: string;
  partyId: string;
  playerId: string;
  playerName: string | null;
  score: number;
  rank: number;
  publishedAt: string;
  publishedBy: string;
};

export type ListProvisionalResult = {
  roundId: string;
  partyId: string;
  scores: ProvisionalScoreView[];
  aggregateStatus: DurableScoreStatus;
  audience: "admin";
};

export type ListPublishedResult = {
  roundId: string;
  partyId: string;
  scores: PublishedScoreView[];
  publishedAt: string | null;
  audience: "player" | "observer" | "admin";
  waitingVerification: boolean;
};

export type CorrectProvisionalInput = {
  roundId: string;
  playerId: string;
  correctedScore: number;
  reason: string;
  actorId: string;
  /** Optimistic concurrency: ProvisionalScore.updatedAt ISO string */
  expectedVersion?: string;
};

export type CorrectProvisionalResult = {
  provisionalScoreId: string;
  previousScore: number;
  correctedScore: number;
  status: DurableScoreStatus;
  version: string;
  reviewId: string;
};

export type PublishResultsInput = {
  roundId: string;
  partyId: string;
  actorId: string;
};

export type PublishResultsResult = {
  roundId: string;
  partyId: string;
  alreadyPublished: boolean;
  publishedCount: number;
  scores: PublishedScoreView[];
};

const STATUS_TO_DOMAIN: Record<string, DomainScoreStatus> = {
  PENDING: DomainScoreStatus.Pending,
  PROVISIONAL: DomainScoreStatus.Provisional,
  UNDER_REVIEW: DomainScoreStatus.UnderReview,
  CORRECTED: DomainScoreStatus.Corrected,
  VERIFIED: DomainScoreStatus.Verified,
  PUBLISHED: DomainScoreStatus.Published,
  VOIDED: DomainScoreStatus.Voided,
};

const DOMAIN_TO_STATUS: Record<DomainScoreStatus, DurableScoreStatus> = {
  [DomainScoreStatus.UNSPECIFIED]: "PENDING",
  [DomainScoreStatus.Pending]: "PENDING",
  [DomainScoreStatus.Provisional]: "PROVISIONAL",
  [DomainScoreStatus.UnderReview]: "UNDER_REVIEW",
  [DomainScoreStatus.Corrected]: "CORRECTED",
  [DomainScoreStatus.Verified]: "VERIFIED",
  [DomainScoreStatus.Published]: "PUBLISHED",
  [DomainScoreStatus.Voided]: "VOIDED",
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  return Number(value ?? 0);
}

function asDurableStatus(status: string): DurableScoreStatus {
  const key = status.toUpperCase();
  if (key in STATUS_TO_DOMAIN) return key as DurableScoreStatus;
  return "PROVISIONAL";
}

function toDomainEntry(row: {
  roundId: string;
  participationId: string;
  status: string;
  score: unknown;
  rank: number | null;
}): ScoreEntry {
  return {
    roundId: row.roundId,
    participationId: row.participationId,
    status: STATUS_TO_DOMAIN[row.status.toUpperCase()] ?? DomainScoreStatus.Provisional,
    score: toNumber(row.score),
    rank: row.rank ?? 0,
    evidenceHash: "",
    publishedAt: null,
  };
}

function evidenceSummary(evidence: unknown): string | null {
  if (!evidence || typeof evidence !== "object") return null;
  const record = evidence as Record<string, unknown>;
  if (typeof record.id === "string") return `ev_${record.id.slice(0, 6)}…`;
  if (typeof record.source === "string") return `src:${record.source}`;
  return "evidence";
}

function aggregateStatus(scores: ProvisionalScoreView[]): DurableScoreStatus {
  if (scores.length === 0) return "PENDING";
  if (scores.every((s) => s.status === "PUBLISHED")) return "PUBLISHED";
  if (scores.some((s) => s.status === "UNDER_REVIEW")) return "UNDER_REVIEW";
  if (scores.some((s) => s.status === "CORRECTED")) return "CORRECTED";
  if (scores.every((s) => s.status === "VERIFIED" || s.status === "CORRECTED")) return "VERIFIED";
  if (scores.some((s) => s.status === "PROVISIONAL" || s.status === "PENDING")) return "PROVISIONAL";
  return "UNDER_REVIEW";
}

function computeRanks(
  rows: Array<{ provisionalScoreId: string; participationId: string; score: number }>,
): Array<{ provisionalScoreId: string; participationId: string; score: number; rank: number }> {
  const sorted = [...rows].sort((a, b) => b.score - a.score || a.participationId.localeCompare(b.participationId));
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * Admin-only listing of provisional scores. Never call from player/observer paths.
 */
export async function listProvisionalScores(roundId: string): Promise<ListProvisionalResult> {
  if (!roundId.trim()) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "round_id est requis", 400);
  }

  const round = await roundRepository.findRoundById(roundId);
  if (!round) {
    throw new ScoringUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }

  const [provisional, participations] = await Promise.all([
    scoreRepository.listProvisionalScoresByRound(roundId),
    participationRepository.listParticipationsByParty(round.partyId),
  ]);

  const byParticipation = new Map(participations.map((p) => [p.id, p]));
  const scores: ProvisionalScoreView[] = provisional.map((row) => {
    const participation = byParticipation.get(row.participationId);
    return {
      provisionalScoreId: row.id,
      roundId: row.roundId,
      participationId: row.participationId,
      playerId: participation?.userId ?? row.participationId,
      playerName: null,
      score: toNumber(row.score),
      rank: row.rank,
      status: asDurableStatus(row.status),
      version: row.updatedAt.toISOString(),
      evidenceSummary: evidenceSummary(row.evidence),
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    };
  });

  scores.sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));

  return {
    roundId: round.id,
    partyId: round.partyId,
    scores,
    aggregateStatus: aggregateStatus(scores),
    audience: "admin",
  };
}

/**
 * Published projection only. Safe for player/observer when scores exist.
 * When empty, waitingVerification=true and scores=[] (no provisional leak).
 */
export async function getPublishedResults(
  partyId: string,
  audience: "player" | "observer" | "admin" = "player",
): Promise<ListPublishedResult> {
  if (!partyId.trim()) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "party_id est requis", 400);
  }

  const party = await partyRepository.findPartyById(partyId);
  if (!party) {
    throw new ScoringUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const rounds = await roundRepository.listRoundsByParty(partyId);
  const ordered = [...rounds].sort((a, b) => b.number - a.number);

  for (const round of ordered) {
    const published = await scoreRepository.listPublishedScoresByRound(round.id);
    if (published.length === 0) continue;

    const participations = await participationRepository.listParticipationsByParty(partyId);
    const byParticipation = new Map(participations.map((p) => [p.id, p]));

    const scores: PublishedScoreView[] = published
      .map((row) => {
        const participation = byParticipation.get(row.participationId);
        return {
          roundId: row.roundId,
          partyId,
          playerId: participation?.userId ?? row.participationId,
          playerName: null,
          score: toNumber(row.score),
          rank: row.rank ?? 0,
          publishedAt: row.publishedAt.toISOString(),
          publishedBy: row.publishedBy,
        };
      })
      .sort((a, b) => a.rank - b.rank || b.score - a.score);

    const publishedAt =
      scores.reduce<string | null>((latest, row) => {
        if (!latest || row.publishedAt > latest) return row.publishedAt;
        return latest;
      }, null) ?? published[0]?.publishedAt.toISOString() ?? null;

    return {
      roundId: round.id,
      partyId,
      scores,
      publishedAt,
      audience,
      waitingVerification: false,
    };
  }

  const latestRound = ordered[0];
  return {
    roundId: latestRound?.id ?? "",
    partyId,
    scores: [],
    publishedAt: null,
    audience,
    waitingVerification: true,
  };
}

export async function correctProvisionalScore(
  input: CorrectProvisionalInput,
): Promise<CorrectProvisionalResult> {
  const reason = input.reason?.trim() ?? "";
  if (!reason) {
    throw new ScoringUseCaseError(
      "AUDIT_REASON_REQUIRED",
      "Une raison d'audit est obligatoire pour corriger un score",
      400,
    );
  }
  if (!Number.isFinite(input.correctedScore)) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "corrected_score invalide", 400);
  }
  if (!input.roundId.trim() || !input.playerId.trim() || !input.actorId.trim()) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "round_id, player_id et acteur sont requis", 400);
  }

  const round = await roundRepository.findRoundById(input.roundId);
  if (!round) {
    throw new ScoringUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }

  const participation = await participationRepository.findParticipation(round.partyId, input.playerId);
  if (!participation) {
    throw new ScoringUseCaseError("PARTICIPATION_NOT_FOUND", "Participant introuvable pour cette manche", 404);
  }

  const provisional = await scoreRepository.findProvisionalScoreByRound(input.roundId, participation.id);
  if (!provisional) {
    throw new ScoringUseCaseError("PROVISIONAL_SCORE_NOT_FOUND", "Score provisoire introuvable", 404);
  }

  if (asDurableStatus(provisional.status) === "PUBLISHED") {
    throw new ScoringUseCaseError(
      "PUBLICATION_FORBIDDEN",
      "Score déjà publié — correction impossible",
      409,
    );
  }

  // Domain lifecycle toward VERIFIED (publishable). Already-verified scores may be re-corrected with audit.
  let entry = toDomainEntry(provisional);
  if (entry.status === DomainScoreStatus.Voided) {
    throw new ScoringUseCaseError("SCORE_NOT_PUBLISHABLE", "Score invalidé non corrigeable", 422);
  }
  if (entry.status !== DomainScoreStatus.Verified) {
    if (entry.status === DomainScoreStatus.Pending) {
      entry = setProvisional(entry);
    }
    if (entry.status === DomainScoreStatus.Provisional) {
      entry = flagForReview(entry);
    }
    if (entry.status === DomainScoreStatus.UnderReview) {
      entry = domainCorrectScore(entry);
    }
    if (entry.status === DomainScoreStatus.Corrected) {
      entry = verifyScore(entry);
    }
    if (entry.status !== DomainScoreStatus.Verified) {
      throw new ScoringUseCaseError(
        "INVALID_TRANSITION",
        `Correction impossible depuis l'état ${provisional.status}`,
        422,
      );
    }
  }

  const previousScore = toNumber(provisional.score);
  const expectedUpdatedAt = input.expectedVersion ? new Date(input.expectedVersion) : undefined;
  if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "expectedVersion invalide", 400);
  }

  try {
    const { review, provisional: updated } = await scoreRepository.createScoreReviewAndUpdateProvisional({
      provisionalScoreId: provisional.id,
      reviewedBy: input.actorId,
      action: previousScore === input.correctedScore ? "APPROVE" : "CORRECT",
      reason,
      previousScore,
      newScore: input.correctedScore,
      provisionalStatus: DOMAIN_TO_STATUS[DomainScoreStatus.Verified],
      expectedUpdatedAt,
    });

    await auditRepository.createAuditLog({
      userId: input.actorId,
      action: "SCORE_CORRECT",
      entity: "ProvisionalScore",
      entityId: provisional.id,
      metadata: {
        roundId: input.roundId,
        playerId: input.playerId,
        previousScore,
        correctedScore: input.correctedScore,
        reason,
        reviewId: review.id,
        versionBefore: provisional.updatedAt.toISOString(),
        versionAfter: updated.updatedAt.toISOString(),
      },
    });

    return {
      provisionalScoreId: updated.id,
      previousScore,
      correctedScore: toNumber(updated.score),
      status: asDurableStatus(updated.status),
      version: updated.updatedAt.toISOString(),
      reviewId: review.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PROVISIONAL_SCORE_VERSION_CONFLICT") {
        throw new ScoringUseCaseError(
          "VERSION_CONFLICT",
          "Conflit de version: un autre administrateur a modifié ce score",
          409,
        );
      }
      if (error.message === "PROVISIONAL_SCORE_ALREADY_PUBLISHED") {
        throw new ScoringUseCaseError(
          "PUBLICATION_FORBIDDEN",
          "Score déjà publié — correction impossible",
          409,
        );
      }
      if (error.message === "PROVISIONAL_SCORE_NOT_FOUND") {
        throw new ScoringUseCaseError("PROVISIONAL_SCORE_NOT_FOUND", "Score provisoire introuvable", 404);
      }
    }
    throw error;
  }
}

export async function publishResults(input: PublishResultsInput): Promise<PublishResultsResult> {
  if (!input.roundId.trim() || !input.partyId.trim() || !input.actorId.trim()) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "round_id, party_id et acteur sont requis", 400);
  }

  const round = await roundRepository.findRoundById(input.roundId);
  if (!round) {
    throw new ScoringUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }
  if (round.partyId !== input.partyId) {
    throw new ScoringUseCaseError("PARTY_ROUND_MISMATCH", "La manche n'appartient pas à cette partie", 400);
  }

  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new ScoringUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const provisional = await scoreRepository.listProvisionalScoresByRound(input.roundId);
  if (provisional.length === 0) {
    throw new ScoringUseCaseError("SCORE_NOT_VERIFIED", "Aucun score provisoire à publier", 422);
  }

  const existingPublished = await scoreRepository.listPublishedScoresByRound(input.roundId);
  if (existingPublished.length > 0 && existingPublished.length === provisional.length) {
    const publishedView = await getPublishedResults(input.partyId, "admin");
    return {
      roundId: input.roundId,
      partyId: input.partyId,
      alreadyPublished: true,
      publishedCount: existingPublished.length,
      scores: publishedView.scores,
    };
  }

  // Domain: every score must be verified (or already corrected path) before publication
  for (const row of provisional) {
    const entry = toDomainEntry(row);
    if (entry.status === DomainScoreStatus.Published) continue;
    if (entry.status === DomainScoreStatus.Voided) {
      throw new ScoringUseCaseError("SCORE_NOT_PUBLISHABLE", "Score invalidé non publiable", 422);
    }
    // Allow VERIFIED and CORRECTED; auto-verify corrected in domain check
    let candidate = entry;
    if (candidate.status === DomainScoreStatus.Corrected) {
      candidate = verifyScore(candidate);
    }
    if (candidate.status !== DomainScoreStatus.Verified && candidate.status !== DomainScoreStatus.Published) {
      // PENDING/PROVISIONAL/UNDER_REVIEW: reject
      try {
        domainPublishScore(candidate);
      } catch {
        throw new ScoringUseCaseError(
          "SCORE_NOT_VERIFIED",
          `Score non vérifié pour participation ${row.participationId} (status=${row.status})`,
          422,
        );
      }
    }
  }

  const ranked = computeRanks(
    provisional.map((row) => ({
      provisionalScoreId: row.id,
      participationId: row.participationId,
      score: toNumber(row.score),
    })),
  );

  const result = await scoreRepository.publishRoundScores({
    roundId: input.roundId,
    publishedBy: input.actorId,
    rows: ranked,
    provisionalStatus: "PUBLISHED",
  });

  if (!result.alreadyPublished) {
    await roundRepository.updateRoundStatus(input.roundId, "PUBLISHED");
    if (party.status !== "RESULTS_PUBLISHED" && party.status !== "COMPLETED") {
      await partyRepository.updatePartyStatus(input.partyId, "RESULTS_PUBLISHED");
    }

    await auditRepository.createAuditLog({
      userId: input.actorId,
      action: "RESULTS_PUBLISH",
      entity: "Round",
      entityId: input.roundId,
      metadata: {
        partyId: input.partyId,
        publishedCount: result.published.length,
        ranks: ranked.map((r) => ({ participationId: r.participationId, rank: r.rank, score: r.score })),
      },
    });
  }

  const publishedView = await getPublishedResults(input.partyId, "admin");
  return {
    roundId: input.roundId,
    partyId: input.partyId,
    alreadyPublished: result.alreadyPublished,
    publishedCount: result.published.length,
    scores: publishedView.scores,
  };
}
