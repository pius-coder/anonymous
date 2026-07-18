import type { ParticipationStatusView } from "@/services/participation/participationAdapter";
import type { PublicPartyCard, PublicPartyDetail } from "@/services/session/types";

type PartyLike = PublicPartyCard | PublicPartyDetail;

export type PlayerJourneyState =
  | "eligible"
  | "full"
  | "closed"
  | "already-registered"
  | "payment-required"
  | "cancelled"
  | "preparation-ready"
  | "live-ready"
  | "results";

const LIVE_PARTICIPATION_STATUSES = new Set([
  "PRESENT",
  "READY",
  "IN_ROOM",
  "PLAYING",
  "FINISHED_ROUND",
  "DISCONNECTED",
  "WAITING_REVIEW",
  "RESULTS_VISIBLE",
  "COMPLETED",
]);

export function isPartyFull(party: PartyLike): boolean {
  return party.capacity > 0 && party.players >= party.capacity;
}

export function isRegistrationOpen(party: PartyLike): boolean {
  return party.serverStatus === "SCHEDULED" || party.serverStatus === "PREPARATION_OPEN";
}

export function isCancelled(participation: ParticipationStatusView | null | undefined): boolean {
  return Boolean(participation?.cancelledAt || participation?.status === "ABANDONED");
}

export function isPaymentRequired(participation: ParticipationStatusView | null | undefined): boolean {
  if (!participation || isCancelled(participation)) return false;
  return participation.paymentState !== "PAID";
}

export function isLiveReady(participation: ParticipationStatusView | null | undefined): boolean {
  if (!participation || isCancelled(participation)) return false;
  return LIVE_PARTICIPATION_STATUSES.has(participation.status) || participation.paymentState === "PAID";
}

export function getPlayerJourneyState(
  party: PartyLike,
  participation: ParticipationStatusView | null | undefined,
): PlayerJourneyState {
  if (isCancelled(participation)) return "cancelled";
  if (!participation) {
    if (!isRegistrationOpen(party)) return "closed";
    if (isPartyFull(party)) return "full";
    return "eligible";
  }
  if (party.status === "published" || party.serverStatus === "RESULTS_PUBLISHED" || party.serverStatus === "COMPLETED") {
    return "results";
  }
  if (isPaymentRequired(participation)) {
    return "payment-required";
  }
  if (party.status === "live") {
    return "live-ready";
  }
  if (party.status === "preparation") {
    return "preparation-ready";
  }
  return "already-registered";
}

export function nextPlayerHref(
  party: PartyLike,
  participation: ParticipationStatusView | null | undefined,
): string {
  const state = getPlayerJourneyState(party, participation);
  switch (state) {
    case "payment-required":
      return `/parties/${party.code}/payment`;
    case "preparation-ready":
      return `/parties/${party.code}/lobby`;
    case "live-ready":
      return `/parties/${party.code}/room`;
    case "results":
      return `/parties/${party.code}/results`;
    case "cancelled":
    case "eligible":
    case "full":
    case "closed":
    case "already-registered":
    default:
      return `/parties/${party.code}/participation`;
  }
}
