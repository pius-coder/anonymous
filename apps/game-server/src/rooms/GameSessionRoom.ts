import { Client, Room } from "colyseus";
import type { Prisma } from "@session-jeu/db";
import { LivePlayer, LiveRoomState } from "./schema/LiveState.js";
import {
  consumeLiveReservation,
  DEFAULT_ROUND_DURATION_MS,
  loadInitialLiveState,
  markPlayerDisconnected,
  markPlayerReconnected,
  RECONNECT_WINDOW_SECONDS,
  startRound,
  submitPlayerAction,
  type LiveAuth,
} from "../live/sessionStore.js";

export const BRIEFING_DURATION_MS = 5 * 1000;

type JoinOptions = {
  sessionId?: string;
  reservationToken?: string;
};

type PlayerActionMessage = {
  nonce?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

type LiveClient = Client<{ auth: LiveAuth }>;

export class GameSessionRoom extends Room<{ state: LiveRoomState; client: LiveClient }> {
  maxClients = 100;
  autoDispose = false;
  maxMessagesPerSecond = 10;
  state = new LiveRoomState();

  private sessionId = "";
  private currentRoundNum = 0;

  async onCreate(options: JoinOptions) {
    if (!options.sessionId) {
      throw new Error("sessionId is required");
    }

    this.sessionId = options.sessionId;
    this.state.sessionId = options.sessionId;
    this.state.roomId = this.roomId;

    const snapshot = await loadInitialLiveState({
      sessionId: options.sessionId,
      roomId: this.roomId,
    });
    if (snapshot.type !== "ok") {
      throw new Error("Session is not live");
    }

    this.maxClients = Math.max(snapshot.session.maxPlayers, snapshot.players.length);
    this.state.phase = snapshot.liveState.phase;

    for (const registration of snapshot.players) {
      const player = new LivePlayer();
      player.userId = registration.userId;
      player.displayName =
        registration.user.profile?.username || registration.user.name || "Player";
      player.connectionStatus = "DISCONNECTED";
      this.state.players.set(registration.userId, player);
    }

    this.clock.setTimeout(() => {
      void this.beginRound(1);
    }, BRIEFING_DURATION_MS);
  }

  async onAuth(client: Client, options: JoinOptions) {
    if (!options.sessionId || !options.reservationToken) {
      throw new Error("Live reservation is required");
    }

    const result = await consumeLiveReservation({
      sessionId: options.sessionId,
      reservationToken: options.reservationToken,
      roomId: this.roomId,
      colyseusSessionId: client.sessionId,
    });
    if (result.type !== "ok") {
      throw new Error(result.type);
    }
    return result.auth;
  }

  onJoin(client: LiveClient) {
    const auth = client.auth;
    if (!auth) {
      throw new Error("Missing live auth");
    }
    const player = this.ensurePlayer(auth.userId);
    player.connectionStatus = "CONNECTED";
    client.send("joined", {
      sessionId: this.sessionId,
      userId: auth.userId,
      reconnectWindowSeconds: RECONNECT_WINDOW_SECONDS,
    });
  }

  async onLeave(client: LiveClient) {
    const userId = client.auth?.userId;
    if (!userId) return;

    const player = this.state.players.get(userId);
    if (player) player.connectionStatus = "RECONNECTING";

    await markPlayerDisconnected({ sessionId: this.sessionId, userId });

    try {
      await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
      const reconnectedPlayer = this.state.players.get(userId);
      if (reconnectedPlayer) reconnectedPlayer.connectionStatus = "CONNECTED";
      await markPlayerReconnected({
        sessionId: this.sessionId,
        userId,
        colyseusSessionId: client.sessionId,
      });
    } catch {
      const disconnectedPlayer = this.state.players.get(userId);
      if (disconnectedPlayer) disconnectedPlayer.connectionStatus = "DISCONNECTED";
    }
  }

  async beginRound(roundNum: number, durationMs = DEFAULT_ROUND_DURATION_MS) {
    this.currentRoundNum = roundNum;
    const result = await startRound({
      sessionId: this.sessionId,
      roundNum,
      durationMs,
    });

    this.state.phase = result.liveState.phase;
    this.state.currentRoundId = result.round.id;
    this.state.roundNum = result.round.roundNum;
    this.state.deadlineEpochMs = result.deadline.deadlineAt.getTime();
    for (const player of this.state.players.values()) {
      player.submittedAction = false;
    }

    this.clock.setTimeout(() => {
      this.state.phase = "RESOLVING";
    }, Math.max(0, result.deadline.deadlineAt.getTime() - Date.now()));

    this.broadcast("round.started", {
      roundId: result.round.id,
      roundNum: result.round.roundNum,
      deadlineAt: result.deadline.deadlineAt.toISOString(),
    });
  }

  messages = {
    action: async (client: LiveClient, message: PlayerActionMessage) => {
      const userId = client.auth?.userId;
      if (!userId || !message.nonce || !message.type) {
        client.send("action.rejected", { reason: "invalid-action" });
        return;
      }

      const result = await submitPlayerAction({
        sessionId: this.sessionId,
        userId,
        actionNonce: message.nonce,
        actionType: message.type,
        payload: (message.payload ?? {}) as Prisma.InputJsonObject,
      });

      if (result.type === "accepted") {
        const player = this.state.players.get(userId);
        if (player) player.submittedAction = true;
        client.send("action.accepted", { actionId: result.action.id });
        return;
      }

      client.send("action.rejected", { reason: result.type });
    },
  };

  private ensurePlayer(userId: string) {
    let player = this.state.players.get(userId);
    if (!player) {
      player = new LivePlayer();
      player.userId = userId;
      player.displayName = "Player";
      this.state.players.set(userId, player);
    }
    return player;
  }
}
