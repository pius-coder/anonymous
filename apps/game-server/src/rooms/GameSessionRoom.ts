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
import {
  subscribeToRoundResolved,
  closeRedisSubscriber,
  type RoundResolvedPayload,
} from "../live/redisSubscribed.js";

export const BRIEFING_DURATION_MS = 5 * 1000;
export const RESULTS_DURATION_MS = 3 * 1000;
export const DEFAULT_MAX_ROUNDS = 6;

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

function publicStateForGame(input: {
  key: string;
  roundNum: number;
  deadlineEpochMs: number;
  players: Array<{ userId: string; displayName: string; isEliminated: boolean }>;
}) {
  if (input.key === "memory-sequence") {
    return { sequenceLength: 3 + input.roundNum - 1, paletteSize: 4 };
  }
  if (input.key === "pure-reaction-duel") {
    return { armed: true, signalOn: false, roundsToWin: 2 };
  }
  if (input.key === "trust-bridge") {
    return { routes: ["alpha", "beta", "gamma"], pairs: input.players.map((p, i) => ({ userId: p.userId, pairId: `pair-${Math.floor(i / 2) + 1}` })) };
  }
  if (input.key === "team-relay") {
    return { steps: ["scan", "align", "lock", "release"], teams: input.players.map((p, i) => ({ userId: p.userId, teamId: i % 2 === 0 ? "red" : "green" })) };
  }
  if (input.key === "danger-sweep") {
    return {
      arena: { width: 1000, height: 700 },
      sweep: { fn: "linear", t0EpochMs: Date.now(), speed: 180, width: 72 },
      players: input.players.map((p, i) => ({ userId: p.userId, x: 160 + (i % 5) * 130, y: 160 + Math.floor(i / 5) * 110 })),
    };
  }
  if (input.key === "silent-vote") {
    return { voteRound: input.roundNum, candidates: input.players.map((p) => ({ userId: p.userId, displayName: p.displayName, hasVoted: false })) };
  }
  return {};
}

export class GameSessionRoom extends Room<{ state: LiveRoomState; client: LiveClient }> {
  maxClients = 100;
  autoDispose = false;
  maxMessagesPerSecond = 10;
  state = new LiveRoomState();

  private sessionId = "";
  private currentRoundNum = 0;
  private maxRounds = DEFAULT_MAX_ROUNDS;
  private unsubscribeFromRoundResolved: (() => void) | null = null;

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
    this.state.maxRounds = DEFAULT_MAX_ROUNDS;

    for (const registration of snapshot.players) {
      const player = new LivePlayer();
      player.userId = registration.userId;
      player.displayName =
        registration.user.profile?.username || registration.user.name || "Player";
      player.connectionStatus = "DISCONNECTED";
      this.state.players.set(registration.userId, player);
    }

    this.unsubscribeFromRoundResolved = await subscribeToRoundResolved(
      this.sessionId,
      this.handleRoundResolved.bind(this),
    );

    this.clock.setTimeout(() => {
      void this.beginRound(1);
    }, BRIEFING_DURATION_MS);
  }

  async onDispose() {
    if (this.unsubscribeFromRoundResolved) {
      this.unsubscribeFromRoundResolved();
      this.unsubscribeFromRoundResolved = null;
    }
    closeRedisSubscriber();
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
    if (this.state.currentRoundId && this.state.currentGameKey) {
      client.send("round.game", this.buildRoundGameMessage());
    }
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
    this.state.currentGameKey = result.miniGameDefinition?.key ?? "";
    this.state.currentGameFamily = result.miniGameDefinition?.family ?? "";
    this.state.currentGameName = result.miniGameDefinition?.name ?? "";
    this.state.roundNum = result.round.roundNum;
    this.state.deadlineEpochMs = result.deadline.deadlineAt.getTime();
    for (const player of this.state.players.values()) {
      player.submittedAction = false;
    }

    this.clock.setTimeout(() => {
      this.state.phase = "RESOLVING";
    }, Math.max(0, result.deadline.deadlineAt.getTime() - Date.now()));

    this.broadcast("round.game", this.buildRoundGameMessage());
    this.broadcast("round.started", {
      roundId: result.round.id,
      roundNum: result.round.roundNum,
      deadlineAt: result.deadline.deadlineAt.toISOString(),
      miniGameKey: this.state.currentGameKey,
    });
  }

  private handleRoundResolved(result: RoundResolvedPayload) {
    this.state.phase = "RESULTS";

    const eliminatedIds = new Set(result.eliminatedIds ?? []);
    for (const [userId, player] of this.state.players) {
      if (eliminatedIds.has(userId)) {
        player.isEliminated = true;
        this.clients
          .filter((c) => (c as LiveClient).auth?.userId === userId)
          .forEach((c) => c.send("you.eliminated", {
            roundId: result.roundId,
            rank: result.ranks[userId] ?? 0,
            score: result.scores[userId] ?? 0,
          }));
      }
    }

    this.broadcast("round.resolved", {
      roundId: result.roundId,
      scores: result.scores,
      ranks: result.ranks,
      qualifiedIds: result.qualifiedIds,
      eliminatedIds: result.eliminatedIds,
      tieGroups: result.tieGroups,
    });

    this.clock.setTimeout(() => {
      if (this.currentRoundNum < this.maxRounds) {
        void this.beginRound(this.currentRoundNum + 1);
      } else {
        this.state.phase = "BRIEFING";
        this.state.sessionStatus = "COMPLETED";
        this.broadcast("session.completed", {
          sessionId: this.sessionId,
        });
      }
    }, RESULTS_DURATION_MS);
  }

  messages = {
    action: async (client: LiveClient, message: PlayerActionMessage) => {
      const userId = client.auth?.userId;
      if (!userId || !message.nonce || !message.type) {
        client.send("action.rejected", { reason: "invalid-action" });
        return;
      }

      const player = this.state.players.get(userId);
      if (player?.isEliminated) {
        client.send("action.rejected", { reason: "player-eliminated" });
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
        const p = this.state.players.get(userId);
        if (p) p.submittedAction = true;
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

  private livePlayersForPublicState() {
    return [...this.state.players.values()].map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      isEliminated: player.isEliminated,
    }));
  }

  private buildRoundGameMessage() {
    return {
      roundId: this.state.currentRoundId,
      roundNum: this.state.roundNum,
      key: this.state.currentGameKey,
      family: this.state.currentGameFamily,
      name: this.state.currentGameName,
      deadlineEpochMs: this.state.deadlineEpochMs,
      publicState: publicStateForGame({
        key: this.state.currentGameKey,
        roundNum: this.state.roundNum,
        deadlineEpochMs: this.state.deadlineEpochMs,
        players: this.livePlayersForPublicState(),
      }),
    };
  }
}
