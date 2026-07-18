import { api, type ApiResponse } from "@/lib/api";

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
  status: string;
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

export type AdminScoreVerificationDossier = {
  partyId: string;
  roundId: string;
  status: string;
  rows: AdminScoreVerificationRow[];
  metrics: {
    mismatchCount: number;
    reviewCount: number;
    publicationDelayMs: number | null;
    expectedGainTotal: number;
    creditedGainTotal: number;
  };
  published: boolean;
};

export function getAdminScoreDossier(
  partyId: string,
  roundId: string,
): Promise<ApiResponse<AdminScoreVerificationDossier>> {
  const query = new URLSearchParams({ roundId });
  return api<AdminScoreVerificationDossier>(
    `/v1/admin/parties/${encodeURIComponent(partyId)}/scores?${query.toString()}`,
  );
}

export function correctAdminScore(
  partyId: string,
  roundId: string,
  input: {
    playerId: string;
    correctedScore: number;
    reason: string;
    expectedVersion?: string;
  },
): Promise<ApiResponse<{ version: string }>> {
  return api(`/v1/admin/parties/${encodeURIComponent(partyId)}/scores/${encodeURIComponent(roundId)}/corrections`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publishAdminScores(
  partyId: string,
  roundId: string,
): Promise<ApiResponse<{ publishedCount: number; alreadyPublished: boolean }>> {
  return api(`/v1/admin/parties/${encodeURIComponent(partyId)}/scores/${encodeURIComponent(roundId)}/publish`, {
    method: "POST",
  });
}
