export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Public catalogue payload after the API response envelope has been unwrapped.
 * It intentionally keeps the catalogue's named collection for backwards-compatible
 * client consumption while exposing the same complete pagination metadata.
 */
export interface PublicCatalogueResponse<T> {
  sessions: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type UserRole = "PLAYER" | "SUPPORT" | "FINANCE" | "ADMIN" | "SUPER_ADMIN";

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
}

export type SessionVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

export interface PublicSession {
  code: string;
  name: string;
  description: string | null;
  entryFee: number;
  maxPlayers: number;
  prizePool: number;
  startTime: string | null;
  endTime: string | null;
  status: string;
  visibility: SessionVisibility;
}

export interface PublicSessionDetail extends PublicSession {
  placesRemaining: number;
  registrationCount: number;
}
