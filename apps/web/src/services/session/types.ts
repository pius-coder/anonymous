/** Public catalogue / detail view models (no admin-only fields). */

export type PublicPartyStatus =
  | "scheduled"
  | "preparation"
  | "live"
  | "review"
  | "published"
  | "unknown";

export type PublicPartyCard = {
  id: string;
  code: string;
  name: string;
  status: PublicPartyStatus;
  /** Raw server status for diagnostics (never used for payment/readiness decisions). */
  serverStatus: string;
  startsAt: string;
  players: number;
  capacity: number;
  entryFee: string;
  game: string;
};

export type PublicPartyDetail = PublicPartyCard & {
  visibility: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  createdAt: string;
};

export type ListPublicPartiesResult = {
  parties: PublicPartyCard[];
  total: number;
};

export type SessionAdapterError = {
  code: string;
  message: string;
};
