"use client";

import { useEffect, useMemo, useState } from "react";
import { LiveRoomShell } from "@/components/live/LiveRoomShell";
import type { LiveChatMessage, LiveSnapshot, LiveSocialRequest } from "@/hooks/useGameRoom";
import { Button } from "@/components/retroui/button";
import { Badge } from "@/components/retroui/badge";

const DEMO_CHAT_BASE_MS = Date.parse("2026-07-10T10:00:00.000Z");

const baseNames = [
  "Alexis974",
  "LunaMoon",
  "RedSam",
  "DarkWolf",
  "SkyBlue",
  "MathisFR",
  "GhostK",
  "Naira",
  "NovaFox",
  "AyoZen",
  "PixelMia",
  "Kiro",
];

const demoGroups: LiveSnapshot["groups"] = [
  { id: "group-1", name: "Les Survivants", leaderId: "demo-1", memberIds: ["demo-1", "demo-4", "demo-7"], maxMembers: 4, accent: "pink", zoneX: 245, zoneY: 190, zoneRadius: 125, locked: false },
  { id: "group-2", name: "Team Phoenix", leaderId: "demo-2", memberIds: ["demo-2", "demo-5"], maxMembers: 4, accent: "teal", zoneX: 760, zoneY: 185, zoneRadius: 122, locked: false },
  { id: "group-3", name: "Alliance Z", leaderId: "demo-3", memberIds: ["demo-3", "demo-6"], maxMembers: 4, accent: "gold", zoneX: 735, zoneY: 520, zoneRadius: 132, locked: false },
];

function buildDemoPlayers(count: number): LiveSnapshot["players"] {
  return Array.from({ length: count }, (_, index) => {
    const id = `demo-${index + 1}`;
    const displayName = baseNames[index] ?? `Survivant ${String(index + 1).padStart(3, "0")}`;
    const angle = index * 2.3999632297;
    const radius = 70 + ((index * 47) % 255);
    const x = Math.round(500 + Math.cos(angle) * radius);
    const y = Math.round(350 + Math.sin(angle) * radius * 0.78);
    const group = demoGroups.find((candidate) => candidate.memberIds.includes(id));
    return {
      userId: id,
      displayName,
      avatarUrl: "",
      connectionStatus: index % 19 === 9 ? "DISCONNECTED" : "CONNECTED",
      role: "PLAYER",
      submittedAction: false,
      isEliminated: false,
      x,
      y,
      facing: "down",
      emote: index === 2 ? "👋" : "",
      chatBubble: index === 1 ? "On se regroupe ?" : "",
      chatBubbleUntil: 0,
      lastPing: "",
      pingX: 0,
      pingY: 0,
      teamId: "",
      pairId: "",
      socialGroupId: group?.id ?? "",
      socialRole: group?.leaderId === id ? "LEADER" : group ? "MEMBER" : "NONE",
    };
  });
}

function initialSnapshot(count = 12): LiveSnapshot {
  return {
    phase: "FORMATION_GROUPES",
    roundNum: 0,
    deadlineEpochMs: Date.now() + 12 * 60_000,
    currentRoundId: "",
    currentGameKey: "",
    currentGameFamily: "",
    currentGameName: "Lobby social",
    players: buildDemoPlayers(count),
    groups: demoGroups.map((group) => ({ ...group, memberIds: [...group.memberIds] })),
  };
}

export default function SocialLab() {
  const [playerCount, setPlayerCount] = useState(12);
  const [snap, setSnap] = useState<LiveSnapshot>(() => initialSnapshot());
  const [messages, setMessages] = useState<LiveChatMessage[]>([
    {
      id: "m1",
      userId: "demo-2",
      targetUserId: "demo-1",
      displayName: "LunaMoon",
      body: "Salut, tu vas vers le centre ?",
      type: "CHAT",
      channel: "PRIVATE",
      createdAt: new Date(DEMO_CHAT_BASE_MS - 180_000).toISOString(),
    },
    {
      id: "m2",
      userId: "demo-1",
      targetUserId: "demo-2",
      displayName: "Alexis974",
      body: "Oui, j’y suis presque.",
      type: "CHAT",
      channel: "PRIVATE",
      createdAt: new Date(DEMO_CHAT_BASE_MS - 120_000).toISOString(),
    },
  ]);
  const [requests, setRequests] = useState<LiveSocialRequest[]>([]);
  const [roundMode, setRoundMode] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [deadlineEpochMs] = useState(() => Date.now() + 12 * 60_000);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSnap((current) => ({
        ...current,
        players: current.players.map((player, index) => {
          if (player.userId === "demo-1") return player;
          const jitterX = Math.sin(Date.now() / 1700 + index) * 3;
          const jitterY = Math.cos(Date.now() / 1900 + index) * 2;
          return {
            ...player,
            x: Math.max(40, Math.min(960, Math.round(player.x + jitterX))),
            y: Math.max(56, Math.min(640, Math.round(player.y + jitterY))),
          };
        }),
      }));
    }, 1600);
    return () => window.clearInterval(interval);
  }, []);

  const gameCard = useMemo(
    () => (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-lg">
          <Badge>APERÇU MINI-JEU</Badge>
          <h2 className="mt-4 font-head text-4xl font-black uppercase">Séquence mémoire</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Cette surface représente la priorité visuelle du round. Les fonctions sociales restent accessibles sans empiler plusieurs fenêtres.
          </p>
          <div className="mx-auto mt-8 grid max-w-xs grid-cols-2 gap-3">
            {["△", "○", "□", "✦"].map((symbol, index) => (
              <button key={symbol} className="premium-inset aspect-square text-4xl transition hover:scale-[1.02] hover:border-primary/40" aria-label={`Symbole ${index + 1}`}>
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),
    [],
  );

  const changePlayerCount = (count: number) => {
    setPlayerCount(count);
    setSnap((current) => ({ ...initialSnapshot(count), phase: current.phase }));
    setRequests([]);
  };

  const addMember = (groupId: string, userId: string) => {
    setSnap((current) => ({
      ...current,
      players: current.players.map((player) => player.userId === userId
        ? { ...player, socialGroupId: groupId, socialRole: "MEMBER" }
        : player),
      groups: current.groups.map((group) => group.id === groupId && !group.memberIds.includes(userId)
        ? { ...group, memberIds: [...group.memberIds, userId] }
        : group),
    }));
  };

  return (
    <LiveRoomShell
      status="connected"
      snap={{
        ...snap,
        phase: roundMode ? "ROUND_ACTIVE" : "FORMATION_GROUPES",
        roundNum: roundMode ? 2 : 0,
        currentRoundId: roundMode ? "round-demo" : "",
        currentGameName: roundMode ? "Séquence mémoire" : "Lobby social",
        deadlineEpochMs,
      }}
      currentGameName={roundMode ? "Séquence mémoire" : "Lobby social"}
      currentUserId="demo-1"
      eliminated={eliminated}
      chatMessages={messages}
      socialRequests={requests}
      onMove={(point) => {
        setSnap((current) => ({
          ...current,
          players: current.players.map((player) => player.userId === "demo-1" ? { ...player, ...point } : player),
        }));
      }}
      onChat={(body, quick, options) => {
        setMessages((current) => [...current, {
          id: `local-${Date.now()}`,
          userId: "demo-1",
          displayName: "Alexis974",
          body,
          type: quick ? "QUICK" : "CHAT",
          channel: options?.channel ?? "GLOBAL",
          targetUserId: options?.targetUserId,
          groupId: options?.groupId,
          createdAt: new Date().toISOString(),
        }]);
      }}
      onPing={() => {}}
      onCreateGroup={(name) => {
        const id = `group-local-${Date.now()}`;
        setSnap((current) => ({
          ...current,
          players: current.players.map((player) => player.userId === "demo-1"
            ? { ...player, socialGroupId: id, socialRole: "LEADER" }
            : player),
          groups: [...current.groups, {
            id,
            name,
            leaderId: "demo-1",
            memberIds: ["demo-1"],
            maxMembers: 4,
            accent: "violet",
            zoneX: 500,
            zoneY: 350,
            zoneRadius: 108,
            locked: false,
          }],
        }));
      }}
      onApplyGroup={(groupId) => {
        const group = snap.groups.find((candidate) => candidate.id === groupId);
        if (!group) return;
        const request: LiveSocialRequest = {
          id: `application-${Date.now()}`,
          kind: "APPLICATION",
          fromUserId: "demo-1",
          toUserId: group.leaderId,
          groupId,
          status: "PENDING",
          createdAtEpochMs: Date.now(),
          expiresAtEpochMs: Date.now() + 60_000,
        };
        setRequests((current) => [...current, request]);
      }}
      onInvitePlayer={(groupId, targetUserId) => {
        setRequests((current) => [...current, {
          id: `invite-${Date.now()}`,
          kind: "INVITATION",
          fromUserId: "demo-1",
          toUserId: targetUserId,
          groupId,
          status: "PENDING",
          createdAtEpochMs: Date.now(),
          expiresAtEpochMs: Date.now() + 60_000,
        }]);
      }}
      onResolveGroupRequest={(requestId, decision) => {
        const request = requests.find((candidate) => candidate.id === requestId);
        if (request && decision === "ACCEPTED") {
          const memberId = request.kind === "APPLICATION" ? request.fromUserId : request.toUserId;
          addMember(request.groupId, memberId);
        }
        setRequests((current) => current.map((requestItem) => requestItem.id === requestId
          ? { ...requestItem, status: decision }
          : requestItem));
      }}
      onLeaveGroup={() => {
        setSnap((current) => {
          const local = current.players.find((player) => player.userId === "demo-1");
          const groupId = local?.socialGroupId;
          return {
            ...current,
            players: current.players.map((player) => player.userId === "demo-1"
              ? { ...player, socialGroupId: "", socialRole: "NONE" }
              : player),
            groups: current.groups
              .map((group) => group.id === groupId
                ? { ...group, memberIds: group.memberIds.filter((id) => id !== "demo-1") }
                : group)
              .filter((group) => group.memberIds.length > 0),
          };
        });
      }}
      onLockGroup={(groupId, locked) => {
        setSnap((current) => ({
          ...current,
          groups: current.groups.map((group) => group.id === groupId ? { ...group, locked } : group),
        }));
      }}
    >
      {roundMode ? gameCard : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-head text-xl font-black uppercase">Salle rétro premium</p>
              <p className="text-xs text-white/48">Teste la carte, les profils, groupes, joueurs, chats et demandes.</p>
            </div>
            <Badge variant="secondary">{playerCount}/100</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[12, 50, 100].map((count) => (
              <Button key={count} size="sm" variant={playerCount === count ? "default" : "outline"} onClick={() => changePlayerCount(count)}>
                {count} joueurs
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setRoundMode(true)}>Lancer un round</Button>
            <Button variant="outline" onClick={() => setEliminated((value) => !value)}>
              {eliminated ? "Annuler élimination" : "Tester élimination"}
            </Button>
          </div>
        </div>
      )}
    </LiveRoomShell>
  );
}
