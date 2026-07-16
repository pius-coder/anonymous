/**
 * Domain adapter for Session (public catalogue + detail).
 * Uses REST use-case surface until SEQ-03 mounts SessionService on the central RPC router.
 * Does not touch `rpcServices.ts`.
 */
import { api } from "@/lib/api";
import type {
  ListPublicPartiesResult,
  PublicPartyCard,
  PublicPartyDetail,
  PublicPartyStatus,
  SessionAdapterError,
} from "./types";

type ApiListItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  participantCount: number;
};

type ApiDetail = ApiListItem & {
  visibility: string;
  roundProgram: unknown;
  createdAt: string;
};

type ApiListResult = {
  parties: ApiListItem[];
  total: number;
};

export type SessionResult<T> =
  | { success: true; data: T }
  | { success: false; error: SessionAdapterError };

function mapStatus(status: string): PublicPartyStatus {
  switch (status) {
    case "SCHEDULED":
      return "scheduled";
    case "PREPARATION_OPEN":
    case "PREPARATION_LOCKED":
    case "READY_TO_START":
      return "preparation";
    case "ACTIVE_ROUND":
    case "ROUND_RESOLVING":
      return "live";
    case "ROUND_VERIFICATION":
    case "WAITING_REVIEW":
      return "review";
    case "RESULTS_PUBLISHED":
    case "COMPLETED":
      return "published";
    default:
      return "unknown";
  }
}

function formatStart(scheduledAt: string | null): string {
  if (!scheduledAt) return "Horaire à confirmer";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(scheduledAt));
  } catch {
    return scheduledAt;
  }
}

function gameFromProgram(roundProgram: unknown): string {
  if (!roundProgram || typeof roundProgram !== "object") return "Programme à confirmer";
  const program = roundProgram as {
    minigameIds?: string[];
    title?: string;
    featuredGame?: string;
  };
  if (typeof program.featuredGame === "string" && program.featuredGame) return program.featuredGame;
  if (typeof program.title === "string" && program.title) return program.title;
  if (Array.isArray(program.minigameIds) && program.minigameIds[0]) return program.minigameIds[0];
  return "Programme à confirmer";
}

function toCard(item: ApiListItem, roundProgram?: unknown): PublicPartyCard {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    status: mapStatus(item.status),
    serverStatus: item.status,
    startsAt: formatStart(item.scheduledAt),
    players: item.participantCount,
    capacity: item.maxPlayers ?? 0,
    entryFee: "Selon configuration",
    game: gameFromProgram(roundProgram),
  };
}

export async function listPublicParties(input?: {
  skip?: number;
  take?: number;
}): Promise<SessionResult<ListPublicPartiesResult>> {
  const skip = input?.skip ?? 0;
  const take = input?.take ?? 50;
  const result = await api<ApiListResult>(`/v1/parties?skip=${skip}&take=${take}`);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Impossible de charger le catalogue.",
      },
    };
  }

  return {
    success: true,
    data: {
      parties: result.data.parties.map((party) => toCard(party)),
      total: result.data.total,
    },
  };
}

export async function getPublicPartyByCode(
  partyCode: string,
): Promise<SessionResult<PublicPartyDetail>> {
  const code = encodeURIComponent(partyCode.trim().toUpperCase());
  const result = await api<ApiDetail>(`/v1/parties/${code}`);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Partie introuvable ou inaccessible.",
      },
    };
  }

  const party = result.data;
  return {
    success: true,
    data: {
      ...toCard(party, party.roundProgram),
      visibility: party.visibility,
      minPlayers: party.minPlayers,
      maxPlayers: party.maxPlayers,
      createdAt: party.createdAt,
    },
  };
}

export const sessionQueryKeys = {
  all: ["session"] as const,
  catalogue: (skip = 0, take = 50) => ["session", "catalogue", skip, take] as const,
  detail: (code: string) => ["session", "detail", code.toUpperCase()] as const,
};
