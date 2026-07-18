import {
  auditRepository,
  participationRepository,
  partyRepository,
  paymentRepository,
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

export type AdminScoreEvidenceView = {
  evidenceHash: string | null;
  minigameVersion: string | null;
  inputRef: string | null;
  configRef: string | null;
  seedRef: string | null;
  hasCiphertext: boolean;
  validationStatus: "VALID" | "BLOCKED";
  validationCode: string | null;
  validationReason: string | null;
};

export type AdminScoreReviewView = {
  id: string;
  action: string;
  reason: string | null;
  reviewedBy: string;
  previousScore: number | null;
  newScore: number | null;
  createdAt: string;
};

export type AdminScoreGainPreview = {
  expectedAmount: number;
  creditedAmount: number;
  credited: boolean;
  walletId: string | null;
  ledgerEntryId: string | null;
  transactionId: string | null;
};

export type AdminScoreVerificationRow = {
  provisionalScoreId: string;
  roundId: string;
  participationId: string;
  playerId: string;
  playerName: string | null;
  playerEmail: string;
  score: number;
  rank: number | null;
  status: DurableScoreStatus;
  version: string;
  evidenceSummary: string | null;
  evidence: AdminScoreEvidenceView;
  reviews: AdminScoreReviewView[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedRank: number | null;
  gainPreview: AdminScoreGainPreview;
};

export type AdminScoreVerificationMetrics = {
  mismatchCount: number;
  reviewCount: number;
  publicationDelayMs: number | null;
  expectedGainTotal: number;
  creditedGainTotal: number;
};

export type AdminScoreVerificationDossier = {
  partyId: string;
  roundId: string;
  status: DurableScoreStatus;
  rows: AdminScoreVerificationRow[];
  metrics: AdminScoreVerificationMetrics;
  published: boolean;
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

type EvidenceValidation = {
  ok: boolean;
  code: string | null;
  reason: string | null;
  evidenceHash: string | null;
  minigameVersion: string | null;
  inputRef: string | null;
  configRef: string | null;
  seedRef: string | null;
  hasCiphertext: boolean;
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
  evidenceHash?: string | null;
}): ScoreEntry {
  return {
    roundId: row.roundId,
    participationId: row.participationId,
    status: STATUS_TO_DOMAIN[row.status.toUpperCase()] ?? DomainScoreStatus.Provisional,
    score: toNumber(row.score),
    rank: row.rank ?? 0,
    evidenceHash: row.evidenceHash?.trim() ?? "",
    publishedAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNestedText(record: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current) || typeof current[key] === "undefined") return null;
    current = current[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function getNestedNumber(record: Record<string, unknown>, path: string[]): number | null {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current) || typeof current[key] === "undefined") return null;
    current = current[key];
  }
  if (typeof current === "number" && Number.isFinite(current)) return current;
  if (typeof current === "string" && current.trim() && Number.isFinite(Number(current))) {
    return Number(current);
  }
  return null;
}

function evidenceSummary(evidence: unknown): string | null {
  if (!isRecord(evidence)) return null;
  if (typeof evidence.id === "string") return `ev_${evidence.id.slice(0, 6)}...`;
  if (typeof evidence.source === "string") return `src:${evidence.source}`;
  return "evidence";
}

function aggregateStatus(scores: Array<{ status: DurableScoreStatus }>): DurableScoreStatus {
  if (scores.length === 0) return "PENDING";
  if (scores.every((s) => s.status === "PUBLISHED")) return "PUBLISHED";
  if (scores.some((s) => s.status === "UNDER_REVIEW")) return "UNDER_REVIEW";
  if (scores.some((s) => s.status === "CORRECTED")) return "CORRECTED";
  if (scores.every((s) => s.status === "VERIFIED" || s.status === "CORRECTED")) return "VERIFIED";
  if (scores.some((s) => s.status === "PROVISIONAL" || s.status === "PENDING")) return "PROVISIONAL";
  return "UNDER_REVIEW";
}

function normalizeMinigameKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
}

function extractEvidenceValidation(
  round: { runtimeVersion: string | null; minigame: string },
  row: {
    evidenceHash: string | null;
    evidence: unknown;
    scoreEvidence: { evidenceHash: string; minigameVersion: string | null; ciphertext: Uint8Array } | null;
  },
): EvidenceValidation {
  const evidence = isRecord(row.evidence) ? row.evidence : {};
  const evidenceHash = row.evidenceHash?.trim() ?? "";
  if (!evidenceHash) {
    return {
      ok: false,
      code: "EVIDENCE_HASH_EMPTY",
      reason: "evidenceHash vide",
      evidenceHash: null,
      minigameVersion: null,
      inputRef: null,
      configRef: null,
      seedRef: null,
      hasCiphertext: false,
    };
  }

  if (!row.scoreEvidence) {
    return {
      ok: false,
      code: "EVIDENCE_MISSING",
      reason: "preuve runtime absente",
      evidenceHash,
      minigameVersion: null,
      inputRef: null,
      configRef: null,
      seedRef: null,
      hasCiphertext: false,
    };
  }

  if (row.scoreEvidence.evidenceHash !== evidenceHash) {
    return {
      ok: false,
      code: "EVIDENCE_MISMATCH",
      reason: "hash evidence mismatch",
      evidenceHash,
      minigameVersion: row.scoreEvidence.minigameVersion,
      inputRef: null,
      configRef: null,
      seedRef: null,
      hasCiphertext: row.scoreEvidence.ciphertext.length > 0,
    };
  }

  const minigameVersion =
    row.scoreEvidence.minigameVersion?.trim() ??
    getNestedText(evidence, ["minigameVersion"]) ??
    getNestedText(evidence, ["runtimeVersion"]) ??
    null;
  if (!minigameVersion) {
    return {
      ok: false,
      code: "EVIDENCE_VERSION_UNKNOWN",
      reason: `version runtime inconnue pour ${round.minigame}`,
      evidenceHash,
      minigameVersion: null,
      inputRef: null,
      configRef: null,
      seedRef: null,
      hasCiphertext: row.scoreEvidence.ciphertext.length > 0,
    };
  }

  if (round.runtimeVersion?.trim() && round.runtimeVersion.trim() !== minigameVersion) {
    return {
      ok: false,
      code: "EVIDENCE_MISMATCH",
      reason: `version runtime mismatch (${minigameVersion} != ${round.runtimeVersion})`,
      evidenceHash,
      minigameVersion,
      inputRef: null,
      configRef: null,
      seedRef: null,
      hasCiphertext: row.scoreEvidence.ciphertext.length > 0,
    };
  }

  const inputRef =
    getNestedText(evidence, ["inputRef"]) ??
    getNestedText(evidence, ["refs", "input"]) ??
    getNestedText(evidence, ["retention", "inputRef"]);
  const configRef =
    getNestedText(evidence, ["configRef"]) ??
    getNestedText(evidence, ["refs", "config"]) ??
    getNestedText(evidence, ["retention", "configRef"]);
  const seedRef =
    getNestedText(evidence, ["seedRef"]) ??
    getNestedText(evidence, ["refs", "seed"]) ??
    getNestedText(evidence, ["retention", "seedRef"]);

  if (!inputRef || !configRef || !seedRef) {
    return {
      ok: false,
      code: "EVIDENCE_MISSING",
      reason: "refs inputs/config/seed manquantes",
      evidenceHash,
      minigameVersion,
      inputRef,
      configRef,
      seedRef,
      hasCiphertext: row.scoreEvidence.ciphertext.length > 0,
    };
  }

  if (!row.scoreEvidence.ciphertext.length) {
    return {
      ok: false,
      code: "EVIDENCE_MISSING",
      reason: "payload evidence chiffre absent",
      evidenceHash,
      minigameVersion,
      inputRef,
      configRef,
      seedRef,
      hasCiphertext: false,
    };
  }

  return {
    ok: true,
    code: null,
    reason: null,
    evidenceHash,
    minigameVersion,
    inputRef,
    configRef,
    seedRef,
    hasCiphertext: true,
  };
}

function compareNumber(a: number | null, b: number | null, direction: "asc" | "desc"): number {
  const left = a ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  const right = b ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  return direction === "asc" ? left - right : right - left;
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}

function compareTieBreak(
  minigame: string,
  a: { participationId: string; evidence: unknown },
  b: { participationId: string; evidence: unknown },
): number {
  const aEvidence = isRecord(a.evidence) ? a.evidence : {};
  const bEvidence = isRecord(b.evidence) ? b.evidence : {};
  switch (normalizeMinigameKey(minigame)) {
    case "danger_sweep": {
      const validA =
        getNestedNumber(aEvidence, ["validCells"]) ??
        getNestedNumber(aEvidence, ["cellsTraversed"]) ??
        getNestedNumber(aEvidence, ["dangerSweep", "validCells"]);
      const validB =
        getNestedNumber(bEvidence, ["validCells"]) ??
        getNestedNumber(bEvidence, ["cellsTraversed"]) ??
        getNestedNumber(bEvidence, ["dangerSweep", "validCells"]);
      return compareNumber(validA, validB, "desc") || compareText(a.participationId, b.participationId);
    }
    case "trust_bridge": {
      const latencyA =
        getNestedNumber(aEvidence, ["doubleSubmitLatencyMs"]) ??
        getNestedNumber(aEvidence, ["maxReceiveTsMs"]) ??
        getNestedNumber(aEvidence, ["trustBridge", "doubleSubmitLatencyMs"]);
      const latencyB =
        getNestedNumber(bEvidence, ["doubleSubmitLatencyMs"]) ??
        getNestedNumber(bEvidence, ["maxReceiveTsMs"]) ??
        getNestedNumber(bEvidence, ["trustBridge", "doubleSubmitLatencyMs"]);
      return compareNumber(latencyA, latencyB, "asc") || compareText(a.participationId, b.participationId);
    }
    case "team_relay": {
      const successA =
        getNestedNumber(aEvidence, ["cumulativeSuccessTimeMs"]) ??
        getNestedNumber(aEvidence, ["teamRelay", "cumulativeSuccessTimeMs"]);
      const successB =
        getNestedNumber(bEvidence, ["cumulativeSuccessTimeMs"]) ??
        getNestedNumber(bEvidence, ["teamRelay", "cumulativeSuccessTimeMs"]);
      return compareNumber(successA, successB, "asc") || compareText(a.participationId, b.participationId);
    }
    case "pure_reaction_duel": {
      const reactionA =
        getNestedNumber(aEvidence, ["reactionTimeMs"]) ??
        getNestedNumber(aEvidence, ["receiveTsMs"]) ??
        getNestedNumber(aEvidence, ["pureReactionDuel", "reactionTimeMs"]);
      const reactionB =
        getNestedNumber(bEvidence, ["reactionTimeMs"]) ??
        getNestedNumber(bEvidence, ["receiveTsMs"]) ??
        getNestedNumber(bEvidence, ["pureReactionDuel", "reactionTimeMs"]);
      return compareNumber(reactionA, reactionB, "asc") || compareText(a.participationId, b.participationId);
    }
    case "silent_vote":
    case "memory_sequence":
    default:
      return compareText(a.participationId, b.participationId);
  }
}

function computeRanks(
  minigame: string,
  rows: Array<{
    provisionalScoreId: string;
    participationId: string;
    score: number;
    evidenceHash?: string | null;
    evidence: unknown;
  }>,
): Array<{
  provisionalScoreId: string;
  participationId: string;
  score: number;
  rank: number;
  evidenceHash?: string | null;
}> {
  const sorted = [...rows].sort(
    (a, b) =>
      b.score - a.score ||
      compareTieBreak(
        minigame,
        { participationId: a.participationId, evidence: a.evidence },
        { participationId: b.participationId, evidence: b.evidence },
      ),
  );
  return sorted.map((row, index) => ({
    provisionalScoreId: row.provisionalScoreId,
    participationId: row.participationId,
    score: row.score,
    rank: index + 1,
    evidenceHash: row.evidenceHash,
  }));
}

function publishedViewFromRows(
  partyId: string,
  rows: Array<{
    roundId: string;
    participationId: string;
    score: unknown;
    rank: number | null;
    publishedAt: Date;
    publishedBy: string;
  }>,
  participations: Array<{ id: string; userId: string }>,
): PublishedScoreView[] {
  const byParticipation = new Map(participations.map((p) => [p.id, p]));
  return rows
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
}

async function buildPrizeRows(
  party: { entryFeeAmount?: unknown | null },
  participations: Array<{
    id: string;
    userId: string;
    paymentState?: string | null;
    paymentTransactionId?: string | null;
  }>,
  ranked: Array<{
    provisionalScoreId: string;
    participationId: string;
    score: number;
    rank: number;
    evidenceHash?: string | null;
  }>,
): Promise<
  Array<{
    provisionalScoreId: string;
    participationId: string;
    score: number;
    rank: number;
    evidenceHash?: string | null;
    prizeAmount?: number;
    walletId?: string;
    userId?: string;
  }>
> {
  const entryFeeAmount = Math.floor(toNumber(party.entryFeeAmount));
  const byParticipation = new Map(participations.map((p) => [p.id, p]));
  if (entryFeeAmount <= 0 || ranked.length === 0) {
    return ranked.map((row) => ({ ...row }));
  }

  const paidCount = participations.filter(
    (participation) =>
      participation.paymentState === "PAID" || Boolean(participation.paymentTransactionId),
  ).length;
  const prizePool = entryFeeAmount * paidCount;
  if (prizePool <= 0) {
    return ranked.map((row) => ({ ...row }));
  }

  const winner = ranked[0];
  const uniqueUserIds = new Set<string>();
  for (const row of ranked) {
    const participation = byParticipation.get(row.participationId);
    if (participation?.userId) uniqueUserIds.add(participation.userId);
  }

  const walletMap = new Map<string, string>();
  await Promise.all(
    [...uniqueUserIds].map(async (userId) => {
      const wallet = await paymentRepository.findWalletByUserId(userId);
      if (wallet) walletMap.set(userId, wallet.id);
    }),
  );

  return ranked.map((row) => {
    const participation = byParticipation.get(row.participationId);
    const userId = participation?.userId;
    const walletId = userId ? walletMap.get(userId) : undefined;
    return {
      ...row,
      prizeAmount: row.participationId === winner?.participationId ? prizePool : 0,
      userId,
      walletId,
    };
  });
}

async function recordPublicationBlock(
  input: { actorId: string; roundId: string; partyId: string },
  validation: EvidenceValidation,
  participationId: string,
): Promise<void> {
  await auditRepository.createAuditLog({
    userId: input.actorId,
    action: "SCORE_PUBLICATION_BLOCKED",
    entity: "Round",
    entityId: input.roundId,
    result: "DENIED",
    reason: validation.reason ?? "publication bloquee",
    metadata: {
      partyId: input.partyId,
      participationId,
      evidenceHash: validation.evidenceHash,
      validationCode: validation.code,
      minigameVersion: validation.minigameVersion,
    },
  });
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

export async function getAdminScoreVerificationDossier(
  partyId: string,
  roundId: string,
): Promise<AdminScoreVerificationDossier> {
  if (!partyId.trim() || !roundId.trim()) {
    throw new ScoringUseCaseError("INVALID_ARGUMENT", "party_id et round_id sont requis", 400);
  }

  const [party, round] = await Promise.all([
    partyRepository.findPartyById(partyId),
    roundRepository.findRoundById(roundId),
  ]);
  if (!party) {
    throw new ScoringUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }
  if (!round || round.partyId !== partyId) {
    throw new ScoringUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }

  const [rows, gains] = await Promise.all([
    scoreRepository.listScoreVerificationRowsByRound(roundId),
    scoreRepository.listPrizeLedgerEntriesByRound(roundId),
  ]);

  const ranked = await buildPrizeRows(
    party,
    rows.map((row) => ({
      id: row.participation.id,
      userId: row.participation.userId,
      paymentState: row.participation.paymentState,
      paymentTransactionId: row.participation.paymentTransactionId,
    })),
    computeRanks(
      round.minigame,
      rows.map((row) => ({
        provisionalScoreId: row.id,
        participationId: row.participationId,
        score: toNumber(row.score),
        evidenceHash: row.evidenceHash,
        evidence: row.evidence,
      })),
    ),
  );
  const gainByParticipation = new Map(
    ranked.map((row) => [
      row.participationId,
      {
        expectedAmount: row.prizeAmount ?? 0,
        walletId: row.walletId ?? null,
        userId: row.userId ?? null,
      },
    ]),
  );
  const gainByUserId = new Map(
    gains.map((ledger) => [
      ledger.transaction.userId ?? "",
      {
        creditedAmount: toNumber(ledger.credit),
        walletId: ledger.walletId ?? ledger.transaction.walletId ?? null,
        ledgerEntryId: ledger.id,
        transactionId: ledger.transactionId,
      },
    ]),
  );

  const verificationRows: AdminScoreVerificationRow[] = rows
    .map((row) => {
      const validation = extractEvidenceValidation(round, row);
      const plan = gainByParticipation.get(row.participationId);
      const credited = gainByUserId.get(row.participation.userId);
      return {
        provisionalScoreId: row.id,
        roundId: row.roundId,
        participationId: row.participationId,
        playerId: row.participation.userId,
        playerName: row.participation.user.name,
        playerEmail: row.participation.user.email,
        score: toNumber(row.score),
        rank: row.rank,
        status: asDurableStatus(row.status),
        version: row.updatedAt.toISOString(),
        evidenceSummary: evidenceSummary(row.evidence),
        evidence: {
          evidenceHash: validation.evidenceHash,
          minigameVersion: validation.minigameVersion,
          inputRef: validation.inputRef,
          configRef: validation.configRef,
          seedRef: validation.seedRef,
          hasCiphertext: validation.hasCiphertext,
          validationStatus: validation.ok ? ("VALID" as const) : ("BLOCKED" as const),
          validationCode: validation.code,
          validationReason: validation.reason,
        },
        reviews: row.reviews.map((review) => ({
          id: review.id,
          action: review.action,
          reason: review.reason,
          reviewedBy: review.reviewedBy,
          previousScore: review.previousScore == null ? null : toNumber(review.previousScore),
          newScore: review.newScore == null ? null : toNumber(review.newScore),
          createdAt: review.createdAt.toISOString(),
        })),
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        publishedAt: row.published?.publishedAt.toISOString() ?? null,
        publishedBy: row.published?.publishedBy ?? null,
        publishedRank: row.published?.rank ?? null,
        gainPreview: {
          expectedAmount: plan?.expectedAmount ?? 0,
          creditedAmount: credited?.creditedAmount ?? 0,
          credited: Boolean(credited),
          walletId: credited?.walletId ?? plan?.walletId ?? null,
          ledgerEntryId: credited?.ledgerEntryId ?? null,
          transactionId: credited?.transactionId ?? null,
        },
      };
    })
    .sort((a, b) => b.score - a.score || compareTieBreak(round.minigame, { participationId: a.participationId, evidence: {} }, { participationId: b.participationId, evidence: {} }));

  const earliestCreated =
    rows.reduce<Date | null>((earliest, row) => {
      if (!earliest || row.createdAt < earliest) return row.createdAt;
      return earliest;
    }, null) ?? null;
  const latestPublished =
    rows.reduce<Date | null>((latest, row) => {
      if (!row.published?.publishedAt) return latest;
      if (!latest || row.published.publishedAt > latest) return row.published.publishedAt;
      return latest;
    }, null) ?? null;

  return {
    partyId,
    roundId,
    status: aggregateStatus(verificationRows),
    rows: verificationRows,
    metrics: {
      mismatchCount: verificationRows.filter((row) => row.evidence.validationStatus === "BLOCKED").length,
      reviewCount: verificationRows.reduce((count, row) => count + row.reviews.length, 0),
      publicationDelayMs:
        earliestCreated && latestPublished ? latestPublished.getTime() - earliestCreated.getTime() : null,
      expectedGainTotal: verificationRows.reduce((sum, row) => sum + row.gainPreview.expectedAmount, 0),
      creditedGainTotal: verificationRows.reduce((sum, row) => sum + row.gainPreview.creditedAmount, 0),
    },
    published: verificationRows.every((row) => row.status === "PUBLISHED") && verificationRows.length > 0,
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
    const scores = publishedViewFromRows(partyId, published, participations);
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
      "Score deja publie - correction impossible",
      409,
    );
  }

  let entry = toDomainEntry(provisional);
  if (entry.status === DomainScoreStatus.Voided) {
    throw new ScoringUseCaseError("SCORE_NOT_PUBLISHABLE", "Score invalide non corrigeable", 422);
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
        `Correction impossible depuis l'etat ${provisional.status}`,
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
          "Conflit de version: un autre administrateur a modifie ce score",
          409,
        );
      }
      if (error.message === "PROVISIONAL_SCORE_ALREADY_PUBLISHED") {
        throw new ScoringUseCaseError(
          "PUBLICATION_FORBIDDEN",
          "Score deja publie - correction impossible",
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
    throw new ScoringUseCaseError("PARTY_ROUND_MISMATCH", "La manche n'appartient pas a cette partie", 400);
  }

  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new ScoringUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const provisional = await scoreRepository.listScoreVerificationRowsByRound(input.roundId);
  if (provisional.length === 0) {
    throw new ScoringUseCaseError("SCORE_NOT_VERIFIED", "Aucun score provisoire a publier", 422);
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

  for (const row of provisional) {
    const entry = toDomainEntry(row);
    if (entry.status === DomainScoreStatus.Published) continue;
    if (entry.status === DomainScoreStatus.Voided) {
      throw new ScoringUseCaseError("SCORE_NOT_PUBLISHABLE", "Score invalide non publiable", 422);
    }
    let candidate = entry;
    if (candidate.status === DomainScoreStatus.Corrected) {
      candidate = verifyScore(candidate);
    }
    if (candidate.status !== DomainScoreStatus.Verified && candidate.status !== DomainScoreStatus.Published) {
      try {
        domainPublishScore(candidate);
      } catch {
        throw new ScoringUseCaseError(
          "SCORE_NOT_VERIFIED",
          `Score non verifie pour participation ${row.participationId} (status=${row.status})`,
          422,
        );
      }
    }

    const validation = extractEvidenceValidation(round, row);
    if (!validation.ok) {
      await recordPublicationBlock(input, validation, row.participationId);
      throw new ScoringUseCaseError(
        validation.code ?? "EVIDENCE_MISSING",
        validation.reason ?? "Publication bloquee par la preuve runtime",
        422,
      );
    }
  }

  const ranked = await buildPrizeRows(
    party,
    provisional.map((row) => ({
      id: row.participation.id,
      userId: row.participation.userId,
      paymentState: row.participation.paymentState,
      paymentTransactionId: row.participation.paymentTransactionId,
    })),
    computeRanks(
      round.minigame,
      provisional.map((row) => ({
        provisionalScoreId: row.id,
        participationId: row.participationId,
        score: toNumber(row.score),
        evidenceHash: row.evidenceHash,
        evidence: row.evidence,
      })),
    ),
  );

  const result = await scoreRepository.publishRoundScoresWithGainsAndAudit({
    roundId: input.roundId,
    publishedBy: input.actorId,
    correlationId: `publish:${input.roundId}:${input.actorId}`,
    rows: ranked.map((row) => ({
      provisionalScoreId: row.provisionalScoreId,
      participationId: row.participationId,
      score: row.score,
      rank: row.rank,
      evidenceHash: row.evidenceHash ?? null,
      prizeAmount: row.prizeAmount ?? 0,
      walletId: row.walletId,
      userId: row.userId,
    })),
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
        gainsCount: result.gains.length,
        gainTotal: result.gains.reduce((sum, gain) => sum + toNumber(gain.credit), 0),
        ranks: ranked.map((row) => ({
          participationId: row.participationId,
          rank: row.rank,
          score: row.score,
          prizeAmount: row.prizeAmount ?? 0,
        })),
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
