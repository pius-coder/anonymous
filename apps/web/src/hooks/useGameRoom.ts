"use client";

import { Client, Room } from "@colyseus/sdk";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export type LivePlayer = {
  userId: string;
  displayName: string;
  connectionStatus: string;
  role: string;
  submittedAction: boolean;
  isEliminated: boolean;
};

export type LiveSnapshot = {
  phase: string;
  roundNum: number;
  deadlineEpochMs: number;
  currentRoundId: string;
  players: LivePlayer[];
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
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const messages = [
      "joined",
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
            players: Map<string, LivePlayer> | LivePlayer[];
          };
          const players = state.players
            ? Array.from(state.players instanceof Map ? state.players.values() : state.players)
            : [];
          setSnap({
            phase: state.phase,
            roundNum: state.roundNum,
            deadlineEpochMs: state.deadlineEpochMs,
            currentRoundId: state.currentRoundId,
            players: players as LivePlayer[],
          });
        });

        for (const t of messages) {
          room.onMessage(t, (data) => setLastMessage({ type: t, data }));
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
              r2.onMessage(t, (data) => setLastMessage({ type: t, data }));
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
    roomRef.current?.send("action", { type, nonce: crypto.randomUUID(), payload });
  };

  return { status, snap, lastMessage, send, sendAction, errorCode };
}
