import { api } from "@/lib/api";
import type { ParticipationStatusView } from "@/services/participation/participationAdapter";
import {
  formatEntryFee,
  formatStart,
  gameFromProgram,
} from "@/services/session/sessionAdapter";
import type { PublicPartyCard } from "@/services/session/types";

type TicketApiItem = ParticipationStatusView & {
  partyCode: string;
  partyName: string;
  partyStatus: string;
  partyDescription: string | null;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
};

type TicketApiResult = {
  tickets: TicketApiItem[];
};

export type TicketView = ParticipationStatusView & {
  party: PublicPartyCard;
};

export type TicketAdapterError = {
  code: string;
  message: string;
};

export type TicketResult<T> =
  | { success: true; data: T }
  | { success: false; error: TicketAdapterError };

function mapPartyStatus(status: string): PublicPartyCard["status"] {
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

function toTicket(item: TicketApiItem): TicketView {
  const capacity = item.maxPlayers ?? 0;
  return {
    ...item,
    party: {
      id: item.partyId,
      code: item.partyCode,
      name: item.partyName,
      status: mapPartyStatus(item.partyStatus),
      serverStatus: item.partyStatus,
      scheduledAt: item.scheduledAt,
      startsAt: formatStart(item.scheduledAt),
      timeZone: "UTC",
      players: capacity,
      capacity,
      description: item.partyDescription,
      roundProgram: item.roundProgram,
      entryFeeAmount: item.entryFeeAmount,
      entryFeeCurrency: item.entryFeeCurrency || "XAF",
      entryFeeLabel: formatEntryFee(item.entryFeeAmount, item.entryFeeCurrency || "XAF"),
      configVersion: item.configVersion ?? 1,
      feeVersion: item.feeVersion ?? 1,
      game: gameFromProgram(item.roundProgram),
    },
  };
}

export async function listMyTickets(): Promise<TicketResult<TicketView[]>> {
  const result = await api<TicketApiResult>("/v1/me/tickets");
  if (!result.success) {
    if (result.error.code === "UNAUTHORIZED" || result.error.code === "Unauthenticated") {
      return {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Connexion requise pour consulter vos tickets.",
        },
      };
    }
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message || "Impossible de charger vos tickets.",
      },
    };
  }

  return {
    success: true,
    data: result.data.tickets.map(toTicket),
  };
}
