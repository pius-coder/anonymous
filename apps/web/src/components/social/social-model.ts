import type { LiveChatMessage, LivePlayer, LiveSocialGroup, LiveSocialRequest } from "@/hooks/useGameRoom";

export type SocialPanel = "NONE" | "PROFILE" | "GROUPS" | "PLAYERS" | "CHAT" | "REQUESTS";

export type SocialGroup = {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  maxMembers: number;
  locked?: boolean;
  accent: "pink" | "teal" | "gold" | "violet";
  zone: { x: number; y: number; radius: number };
};

export type SocialRequest = {
  id: string;
  kind: "INVITATION" | "APPLICATION";
  fromUserId: string;
  toUserId?: string;
  groupId: string;
  status: "PENDING" | "ACCEPTED" | "REFUSED" | "EXPIRED";
  createdAtEpochMs?: number;
  expiresAtEpochMs?: number;
};

export type SocialThread = {
  id: string;
  title: string;
  type: "PRIVATE" | "GROUP" | "SYSTEM";
  participantIds: string[];
  unread: number;
  messages: LiveChatMessage[];
};


export function socialGroupsFromLive(groups: LiveSocialGroup[]): SocialGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    leaderId: group.leaderId,
    memberIds: [...group.memberIds],
    maxMembers: group.maxMembers,
    locked: group.locked,
    accent: group.accent,
    zone: { x: group.zoneX, y: group.zoneY, radius: group.zoneRadius },
  }));
}

export function socialRequestsFromLive(requests: LiveSocialRequest[]): SocialRequest[] {
  return requests.map((request) => ({ ...request }));
}

const groupNames = ["Les Survivants", "Team Phoenix", "Alliance Z", "Les Stratèges", "Nomades"];
const accents: SocialGroup["accent"][] = ["pink", "teal", "gold", "violet", "teal"];
const zones = [
  { x: 245, y: 190, radius: 125 },
  { x: 760, y: 185, radius: 122 },
  { x: 735, y: 520, radius: 132 },
  { x: 270, y: 515, radius: 128 },
  { x: 500, y: 350, radius: 118 },
];

export function buildSocialGroups(players: LivePlayer[], maxMembers = 4): SocialGroup[] {
  if (players.length === 0) return [];
  const count = Math.max(1, Math.min(5, Math.ceil(players.length / maxMembers)));
  return Array.from({ length: count }, (_, index) => {
    const memberIds = players
      .filter((_, playerIndex) => playerIndex % count === index)
      .slice(0, maxMembers)
      .map((player) => player.userId);
    const leaderId = memberIds[0] ?? players[index % players.length]?.userId ?? "";
    return {
      id: `group-${index + 1}`,
      name: groupNames[index] ?? `Groupe ${index + 1}`,
      leaderId,
      memberIds,
      maxMembers,
      accent: accents[index] ?? "pink",
      zone: zones[index] ?? zones[0],
    };
  });
}

export function buildSocialRequests(players: LivePlayer[], groups: SocialGroup[]): SocialRequest[] {
  if (players.length === 0 || groups.length === 0) return [];
  return players.slice(0, 3).map((player, index) => ({
    id: `request-${index + 1}`,
    kind: index === 2 ? "APPLICATION" : "INVITATION",
    fromUserId: player.userId,
    toUserId: groups[index % groups.length]?.leaderId,
    groupId: groups[index % groups.length]?.id ?? groups[0].id,
    status: "PENDING",
  }));
}

export function playerPublicStats(player: LivePlayer) {
  const seed = [...player.userId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    level: 10 + (seed % 34),
    followers: 180 + (seed % 1320),
    bestRank: 1 + (seed % 12),
    wins: seed % 9,
    trust: 68 + (seed % 31),
    winRate: 24 + (seed % 69),
    eliminations: 4 + (seed % 30),
    survivalSeconds: 600 + (seed % 1300),
  };
}

export function groupForPlayer(groups: SocialGroup[], playerId: string) {
  return groups.find((group) => group.memberIds.includes(playerId));
}

export function playerDistance(a: LivePlayer | undefined, b: LivePlayer) {
  if (!a) return 0;
  return Math.round(Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0)));
}
