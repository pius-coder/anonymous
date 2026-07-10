export type SessionStatus = "DRAFT" | "PUBLISHED" | "OPEN" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type CatalogueSession = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryFee: number;
  maxPlayers: number;
  prizePool: number;
  startTime: string | null;
  endTime: string | null;
  status: SessionStatus;
  visibility: string;
  placesRemaining: number;
  registrationCount: number;
};

export type SessionDetail = CatalogueSession;
