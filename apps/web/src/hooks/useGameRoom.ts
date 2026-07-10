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
};

export type RoundGameMessage = {
  key: string;
  family: string;
  name: string;
  deadlineEpochMs: number;
  publicState?: Record<string, unknown>;
};

export type LiveChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  body: string;
  type: string;
  createdAt: string;
};

export type Status = "connecting" | "connected" | "reconnecting" | "ended" | "error";

export const GAME_ROOM_NAME = "game_session";

type Reservation = {
  reservation: { token: string };
  websocket: { endpoint: string; roomName: string; options: Record<string, unknown> };
  liveState?: unknown;
};

export function useGameRoom(sessionId: string) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [lastMessage, setLastMessage] = useState<{ type: string; data: unknown } | null>(null);
  const [currentGame, setCurrentGame] = useState<RoundGameMessage | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const messages = [
      "joined",
      "round.game",
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
      "ping.spawned",
      "zones.round",
      "zones.locked",
    ];

    (async () => {
      try {
        const jt = await apiGet<{ joinToken: { token: string } }>(
          `/sessions/${sessionId}/join-token`,
        );
        if (!jt.ok) {
          setErrorCode(jt.error.code);
          setStatus("error");
          return;
        }
        const res = await apiPost<Reservation>(`/live/sessions/${sessionId}/reservation`, {
          joinToken: jt.data.joinToken.token,
        });
        if (!res.ok) {
          setErrorCode(res.error.code);
          setStatus("error");
          return;
        }

        const client = new Client(res.data.websocket.endpoint);
        const room = await client.joinOrCreate(
          res.data.websocket.roomName,
          res.data.websocket.options as Record<string, unknown>,
        );
        if (disposed) {
          room.leave();
          return;
        }
        roomRef.current = room;
        sessionStorage.setItem(`reconn:${sessionId}`, room.reconnectionToken);
        setStatus("connected");

        room.onStateChange((s: unknown) => {
          const state = s as {
            phase: string;
            roundNum: number;
            deadlineEpochMs: number;
            currentRoundId: string;
            currentGameKey?: string;
            currentGameFamily?: string;
            currentGameName?: string;
            players: Map<string, LivePlayer> | LivePlayer[];
          };
          const raw = state.players as Record<string, LivePlayer | null> | LivePlayer[] | Map<string, LivePlayer>;
          const players: LivePlayer[] = [];
          if (raw) {
            if (typeof (raw as Map<string, LivePlayer>).forEach === "function") {
              (raw as Map<string, LivePlayer>).forEach((p) => { if (p) players.push(p); });
            } else if (Array.isArray(raw)) {
              for (const p of raw) { if (p) players.push(p); }
            } else {
              for (const p of Object.values(raw)) { if (p) players.push(p); }
            }
          }
          setSnap({
            phase: state.phase,
            roundNum: state.roundNum,
            deadlineEpochMs: state.deadlineEpochMs,
            currentRoundId: state.currentRoundId,
            currentGameKey: state.currentGameKey,
            currentGameFamily: state.currentGameFamily,
            currentGameName: state.currentGameName,
            players,
          });
        });

        for (const t of messages) {
          room.onMessage(t, (data) => {
            if (t === "round.game") setCurrentGame(data as RoundGameMessage);
            if (t === "chat.message") {
              setChatMessages((messages) => [...messages.slice(-39), data as LiveChatMessage]);
            }
            setLastMessage({ type: t, data });
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
            if (!token) {
              setStatus("error");
              return;
            }
            const r2 = await client.reconnect(token);
            if (disposed) {
              r2.leave();
              return;
            }
            roomRef.current = r2;
            setStatus("connected");
            for (const t of messages) {
              r2.onMessage(t, (data) => {
                if (t === "round.game") setCurrentGame(data as RoundGameMessage);
                if (t === "chat.message") {
                  setChatMessages((messages) => [...messages.slice(-39), data as LiveChatMessage]);
                }
                setLastMessage({ type: t, data });
              });
            }
            r2.onLeave((c) => {
              if (c === 1000) setStatus("ended");
              else setStatus("reconnecting");
            });
          } catch {
            setStatus("error");
          }
        });
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

  const send = (type: string, data: unknown) => {
    roomRef.current?.send(type, data);
  };

  const sendAction = (type: string, payload: unknown) => {
    roomRef.current?.send("action", { type, nonce: randomNonce("act"), payload });
  };

  const sendMove = (point: { x: number; y: number }) => roomRef.current?.send("move", point);
  const sendChat = (body: string, quick = false) => roomRef.current?.send("chat.send", { body, quick });
  const sendPing = (type: string, point?: { x: number; y: number }) =>
    roomRef.current?.send("ping.send", { type, ...(point ?? {}) });
  const sendEmote = (emote: string) => roomRef.current?.send("emote.send", { emote });

  return {
    status,
    snap,
    lastMessage,
    currentGame,
    chatMessages,
    send,
    sendAction,
    sendMove,
    sendChat,
    sendPing,
    sendEmote,
    errorCode,
  };
}
