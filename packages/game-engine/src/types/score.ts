export enum ScoreStatus {
  UNSPECIFIED = 0,
  Pending = 1,
  Provisional = 2,
  UnderReview = 3,
  Corrected = 4,
  Published = 5,
  Voided = 6,
}

export interface ProvisionalScore {
  roundId: string
  participationId: string
  score: number
  rank: number
  evidenceHash: string
}

export interface PublishedScore {
  roundId: string
  participationId: string
  score: number
  rank: number
  publishedAt: Date
}

export interface ScoreEntry {
  roundId: string
  participationId: string
  status: ScoreStatus
  score: number
  rank: number
  evidenceHash: string
  publishedAt: Date | null
}
