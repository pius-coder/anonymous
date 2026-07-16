import { uiParties, type UiParty } from "@/lib/ui-data";

export function findPlayerParty(partyCode: string): UiParty | undefined {
  const decodedCode = decodeURIComponent(partyCode).toUpperCase();
  return uiParties.find((party) => party.code === decodedCode);
}

export function playerPartyHref(party: UiParty) {
  if (party.status === "published") return `/parties/${party.code}/results`;
  if (party.status === "review") return `/parties/${party.code}/waiting`;
  if (party.status === "live") return `/parties/${party.code}/room`;
  if (party.status === "preparation") return `/parties/${party.code}/lobby`;
  return `/parties/${party.code}/participation`;
}

export function isPartyFull(party: UiParty) {
  return party.players >= party.capacity;
}
