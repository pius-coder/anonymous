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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface UserContext {
  id: string;
  email: string;
  role: string;
}

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
  isPublic: boolean;
}

export interface PublicSessionDetail extends PublicSession {
  placesRemaining: number;
  registrationCount: number;
}
