"use client";

import { Client, Room } from "@colyseus/sdk";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { randomNonce } from "@/lib/nonce";

export type LivePlayer = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  connectionStatus: string;
  role: string;
  submittedAction: boolean;
  isEliminated: boolean;
  x: number;
  y: number;
  facing: string;
  emote: string;
  chatBubble: string;
  chatBubbleUntil: number;
  lastPing: string;
  pingX: number;
  pingY: number;
  teamId: string;
  pairId: string;
  socialGroupId?: string;
  socialRole?: string;
};

export type LiveSocialGroup = {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  maxMembers: number;
  accent: "pink" | "teal" | "gold" | "violet";
  zoneX: number;
  zoneY: number;
  zoneRadius: number;
  locked: boolean;
};

export type LiveSocialRequest = {
  id: string;
  kind: "INVITATION" | "APPLICATION";
  fromUserId: string;
  toUserId: string;
  groupId: string;
  status: "PENDING" | "ACCEPTED" | "REFUSED" | "EXPIRED";
  createdAtEpochMs: number;
  expiresAtEpochMs: number;
};

export type LiveSnapshot = {
  phase: string;
  roundNum: number;
  deadlineEpochMs: number;
  currentRoundId: string;
  currentGameKey?: string;
  currentGameFamily?: string;
  currentGameName?: string;
  players: LivePlayer[];
  groups: LiveSocialGroup[];
};

export type PrivateRoundRole = { roundId: string; role: "IMPOSTOR" | "CITIZEN"; objective: string };

export type RoundGameMessage = {
  key: string;
  family: string;
  name: string;
  deadlineEpochMs: number;
  publicState?: Record<string, unknown>;
};

export type LiveChatChannel = "GLOBAL" | "PRIVATE" | "GROUP" | "SYSTEM";

export type LiveChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  body: string;
  type: string;
  channel?: LiveChatChannel;
  targetUserId?: string;
  groupId?: string;
  threadId?: string;
  createdAt: string;
};

export type Status = "connecting" | "connected" | "reconnecting" | "ended" | "error";

export const GAME_ROOM_NAME = "game_session";

type Reservation = {
  reservation: { token: string };
  websocket: { endpoint: string; roomName: string; options: Record<string, unknown> };
  liveState?: unknown;
};

const MESSAGE_TYPES = [
  "joined",
  "round.game",
  "role.assigned",
  "round.started",
  "round.resolved",
  "you.eliminated",
  "sequence.show",
  "question.next",
  "signal",
  "manche.armed",
  "action.accepted",
  "action.rejected",
  "session.completed",
  "brief.started",
  "chat.message",
  "chat.rejected",
  "ping.spawned",
  "zones.round",
  "zones.locked",
  "social.requests",
  "social.request.created",
  "social.request.updated",
  "social.request.removed",
  "group.updated",
  "group.accepted",
  "group.rejected",
] as const;

function valuesFromSchema<T>(raw: unknown): T[] {
  if (!raw) return [];
  const values: T[] = [];
  if (typeof (raw as Map<string, T>).forEach === "function") {
    (raw as Map<string, T>).forEach((value) => {
      if (value) values.push(value);
    });
    return values;
  }
  if (Array.isArray(raw)) return raw.filter(Boolean) as T[];
  for (const value of Object.values(raw as Record<string, T | null>)) {
    if (value) values.push(value);
  }
  return values;
}


function socialSystemText(type: string, data: unknown) {
  const reason = typeof (data as { reason?: unknown } | null)?.reason === "string"
    ? (data as { reason: string }).reason
    : "";
  const reasons: Record<string, string> = {
    cooldown: "Attends un instant avant d’envoyer un autre message.",
    "spectator-chat-locked": "Le chat joueur est verrouillé pendant que tu observes ce round.",
    "invalid-recipient": "Ce destinataire n’est plus disponible.",
    "group-required": "Rejoins un groupe avant d’utiliser ce canal.",
    "round-in-progress": "Les groupes sont verrouillés pendant le round.",
    "already-in-group": "Tu appartiens déjà à un groupe.",
    "group-not-found": "Ce groupe n’est plus disponible.",
    "group-unavailable": "Ce groupe est fermé ou complet.",
    "application-limit": "Tu as déjà deux candidatures en attente.",
    "already-applied": "Ta candidature est déjà en attente.",
    "target-unavailable": "Ce joueur ne peut pas être invité.",
    "already-invited": "Une invitation est déjà en attente.",
    "not-authorized": "Cette action est réservée au chef du groupe.",
    "request-not-found": "Cette demande a expiré ou a déjà été traitée.",
  };
  if (type === "group.accepted") return "Action de groupe confirmée.";
  if (type === "chat.rejected") return reasons[reason] ?? "Message non envoyé.";
  if (type === "group.rejected") return reasons[reason] ?? "Action de groupe refusée.";
  return null;
}

function normalizeGroup(group: LiveSocialGroup): LiveSocialGroup {
  const accent = ["pink", "teal", "gold", "violet"].includes(group.accent)
    ? group.accent
    : "pink";
  return {
    id: group.id,
    name: group.name,
    leaderId: group.leaderId,
    memberIds: valuesFromSchema<string>(group.memberIds),
    maxMembers: group.maxMembers,
    accent: accent as LiveSocialGroup["accent"],
    zoneX: group.zoneX,
    zoneY: group.zoneY,
    zoneRadius: group.zoneRadius,
    locked: group.locked,
  };
}

export function useGameRoom(sessionId: string) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [lastMessage, setLastMessage] = useState<{ type: string; data: unknown } | null>(null);
  const [currentGame, setCurrentGame] = useState<RoundGameMessage | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [privateRole, setPrivateRole] = useState<PrivateRoundRole | null>(null);
  const [socialRequests, setSocialRequests] = useState<LiveSocialRequest[]>([]);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let client: Client | null = null;

    const handleState = (stateValue: unknown) => {
      const state = stateValue as {
        phase: string;
        roundNum: number;
        deadlineEpochMs: number;
        currentRoundId: string;
        currentGameKey?: string;
        currentGameFamily?: string;
        currentGameName?: string;
        players: unknown;
        groups?: unknown;
      };
      setSnap({
        phase: state.phase,
        roundNum: state.roundNum,
        deadlineEpochMs: state.deadlineEpochMs,
        currentRoundId: state.currentRoundId,
        currentGameKey: state.currentGameKey,
        currentGameFamily: state.currentGameFamily,
        currentGameName: state.currentGameName,
        players: valuesFromSchema<LivePlayer>(state.players),
        groups: valuesFromSchema<LiveSocialGroup>(state.groups).map(normalizeGroup),
      });
    };

    const mergeRequest = (request: LiveSocialRequest) => {
      setSocialRequests((current) => {
        const index = current.findIndex((item) => item.id === request.id);
        if (index < 0) return [...current, request];
        return current.map((item) => (item.id === request.id ? request : item));
      });
    };

    const attachRoom = (room: Room) => {
      roomRef.current = room;
      sessionStorage.setItem(`reconn:${sessionId}`, room.reconnectionToken);
      room.onStateChange(handleState);

      for (const type of MESSAGE_TYPES) {
        room.onMessage(type, (data: unknown) => {
          if (type === "round.game") {
            setCurrentGame(data as RoundGameMessage);
            setPrivateRole(null);
          }
          if (type === "role.assigned") setPrivateRole(data as PrivateRoundRole);
          if (type === "chat.message") {
            setChatMessages((messages) => [...messages.slice(-39), data as LiveChatMessage]);
          }
          if (type === "social.requests") {
            const payload = data as { requests?: LiveSocialRequest[] };
            setSocialRequests(payload.requests ?? []);
          }
          if (type === "social.request.created" || type === "social.request.updated") {
            mergeRequest(data as LiveSocialRequest);
          }
          if (type === "social.request.removed") {
            const payload = data as { requestId?: string };
            if (payload.requestId) {
              setSocialRequests((current) => current.filter((request) => request.id !== payload.requestId));
            }
          }
          const systemText = socialSystemText(type, data);
          if (systemText) {
            setChatMessages((messages) => [...messages.slice(-39), {
              id: `system-${Date.now()}-${type}`,
              userId: "system",
              displayName: "Système",
              body: systemText,
              type: "SYSTEM",
              channel: "SYSTEM",
              createdAt: new Date().toISOString(),
            }]);
          }
          setLastMessage({ type, data });
        });
      }

      room.onLeave(async (code) => {
        if (disposed) return;
        if (code === 1000) {
          setStatus("ended");
          return;
        }
        setStatus("reconnecting");
        try {
          const token = sessionStorage.getItem(`reconn:${sessionId}`);
          if (!token || !client) {
            setStatus("error");
            return;
          }
          const reconnectedRoom = await client.reconnect(token);
          if (disposed) {
            reconnectedRoom.leave();
            return;
          }
          attachRoom(reconnectedRoom);
          setStatus("connected");
        } catch {
          if (!disposed) setStatus("error");
        }
      });
    };

    void (async () => {
      try {
        const joinToken = await apiGet<{ joinToken: { token: string } }>(
          `/sessions/${sessionId}/join-token`,
        );
        if (!joinToken.ok) {
          setErrorCode(joinToken.error.code);
          setStatus("error");
          return;
        }
        const reservation = await apiPost<Reservation>(`/live/sessions/${sessionId}/reservation`, {
          joinToken: joinToken.data.joinToken.token,
        });
        if (!reservation.ok) {
          setErrorCode(reservation.error.code);
          setStatus("error");
          return;
        }

        client = new Client(reservation.data.websocket.endpoint);
        const room = await client.joinOrCreate(
          reservation.data.websocket.roomName,
          reservation.data.websocket.options as Record<string, unknown>,
        );
        if (disposed) {
          room.leave();
          return;
        }
        attachRoom(room);
        setStatus("connected");
      } catch {
        if (!disposed) setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [sessionId]);

  const send = (type: string, data: unknown) => roomRef.current?.send(type, data);
  const sendAction = (type: string, payload: unknown) =>
    roomRef.current?.send("action", { type, nonce: randomNonce("act"), payload });
  const sendMove = (point: { x: number; y: number }) => roomRef.current?.send("move", point);
  const sendChat = (
    body: string,
    quick = false,
    options?: { channel?: LiveChatChannel; targetUserId?: string; groupId?: string },
  ) => roomRef.current?.send("chat.send", { body, quick, ...options });
  const sendPing = (type: string, point?: { x: number; y: number }) =>
    roomRef.current?.send("ping.send", { type, ...(point ?? {}) });
  const sendEmote = (emote: string) => roomRef.current?.send("emote.send", { emote });
  const createGroup = (name: string) => roomRef.current?.send("group.create", { name });
  const applyToGroup = (groupId: string) => roomRef.current?.send("group.apply", { groupId });
  const inviteToGroup = (groupId: string, targetUserId: string) =>
    roomRef.current?.send("group.invite", { groupId, targetUserId });
  const resolveGroupRequest = (requestId: string, decision: "ACCEPTED" | "REFUSED") =>
    roomRef.current?.send("group.request.resolve", { requestId, decision });
  const leaveGroup = () => roomRef.current?.send("group.leave", {});
  const lockGroup = (groupId: string, locked: boolean) =>
    roomRef.current?.send("group.lock", { groupId, locked });

  return {
    status,
    snap,
    lastMessage,
    currentGame,
    chatMessages,
    privateRole,
    socialRequests,
    send,
    sendAction,
    sendMove,
    sendChat,
    sendPing,
    sendEmote,
    createGroup,
    applyToGroup,
    inviteToGroup,
    resolveGroupRequest,
    leaveGroup,
    lockGroup,
    errorCode,
  };
}
