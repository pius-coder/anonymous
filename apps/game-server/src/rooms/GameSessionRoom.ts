import { Client, Room } from "colyseus";
import type { Prisma } from "@session-jeu/db";
import { LivePlayer, LiveRoomState } from "./schema/LiveState.js";
import {
  closeAndFinalizeRound,
  consumeLiveReservation,
  DEFAULT_ROUND_DURATION_MS,
  loadInitialLiveState,
  markPlayerDisconnected,
  markPlayerReconnected,
  RECONNECT_WINDOW_SECONDS,
  recordSessionChatMessage,
  startRound,
  submitPlayerAction,
  type LiveAuth,
} from "../live/sessionStore.js";
import {
  subscribeToRoundResolved,
  closeRedisSubscriber,
  type RoundResolvedPayload,
} from "../live/redisSubscribed.js";
import {
  closeLiveCommandSubscriber,
  subscribeToLiveCommands,
  type LiveCommand,
} from "../live/liveCommands.js";

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

type MoveMessage = {
  x?: number;
  y?: number;
  facing?: string;
};

type ChatMessage = {
  body?: string;
  quick?: boolean;
};

type PingMessage = {
  type?: string;
  x?: number;
  y?: number;
};

type LiveClient = Client<{ auth: LiveAuth }>;

function publicStateForGame(input: {
  key: string;
  roundNum: number;
  deadlineEpochMs: number;
  players: Array<{ userId: string; displayName: string; isEliminated: boolean }>;
}) {
  if (input.key === "memory-sequence") {
    return {
      sequenceLength: 3 + input.roundNum - 1,
      paletteSize: 6,
      maxRounds: 10,
    };
  }
  if (input.key === "pure-reaction-duel") {
    return {
      armed: true,
      signalOn: false,
      roundsToWin: 2,
      signalDelayRangeMs: [2000, 6000],
    };
  }
  if (input.key === "trust-bridge") {
    return {
      routes: [
        { id: "alpha", label: "Alpha", risk: "stable" },
        { id: "beta", label: "Beta", risk: "instable" },
        { id: "gamma", label: "Gamma", risk: "rapide" },
      ],
      pairs: input.players.map((p, i) => ({
        userId: p.userId,
        pairId: `pair-${Math.floor(i / 2) + 1}`,
      })),
    };
  }
  if (input.key === "team-relay") {
    return {
      steps: ["scan", "align", "lock", "release"],
      teams: input.players.map((p, i) => ({
        userId: p.userId,
        teamId: i % 2 === 0 ? "red" : "green",
      })),
    };
  }
  if (input.key === "danger-sweep") {
    return {
      arena: { width: 1000, height: 700 },
      sweep: {
        fn: "linear",
        t0EpochMs: input.deadlineEpochMs - 30_000,
        speed: 180,
        width: 72,
      },
      players: input.players.map((p, i) => ({
        userId: p.userId,
        displayName: p.displayName,
        x: 160 + (i % 5) * 130,
        y: 160 + Math.floor(i / 5) * 110,
        eliminated: p.isEliminated,
      })),
    };
  }
  if (input.key === "silent-vote") {
    return {
      voteRound: input.roundNum,
      roles: input.players.map((p, i) => ({
        userId: p.userId,
        role: i % 4 === 0 ? "hidden" : "citizen",
      })),
      candidates: input.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        hasVoted: false,
      })),
    };
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
  private unsubscribeFromLiveCommands: (() => void) | null = null;
  private resolvedRoundIds = new Set<string>();

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
      player.avatarUrl = registration.user.profile?.avatarUrl ?? "";
      player.connectionStatus = "DISCONNECTED";
      this.placePlayer(player, this.state.players.size);
      this.state.players.set(registration.userId, player);
    }

    this.unsubscribeFromRoundResolved = await subscribeToRoundResolved(
      this.sessionId,
      this.handleRoundResolved.bind(this),
    );
    this.unsubscribeFromLiveCommands = await subscribeToLiveCommands(
      this.sessionId,
      this.handleLiveCommand.bind(this),
    );
  }

  async onDispose() {
    if (this.unsubscribeFromRoundResolved) {
      this.unsubscribeFromRoundResolved();
      this.unsubscribeFromRoundResolved = null;
    }
    closeRedisSubscriber();
    if (this.unsubscribeFromLiveCommands) {
      this.unsubscribeFromLiveCommands();
      this.unsubscribeFromLiveCommands = null;
    }
    closeLiveCommandSubscriber();
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
    if (player.x === 0 && player.y === 0) this.placePlayer(player, this.state.players.size);
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
    this.resolvedRoundIds.delete(result.round.id);
    const activeParticipantIds = new Set(result.participants.map((participant) => participant.userId));
    for (const player of this.state.players.values()) {
      player.submittedAction = false;
      if (!activeParticipantIds.has(player.userId)) {
        player.isEliminated = true;
      }
    }

    this.clock.setTimeout(() => {
      void this.closeCurrentRound(result.round.id);
    }, Math.max(0, result.deadline.deadlineAt.getTime() - Date.now()));

    this.broadcast("round.game", this.buildRoundGameMessage());
    this.broadcast("round.started", {
      roundId: result.round.id,
      roundNum: result.round.roundNum,
      deadlineAt: result.deadline.deadlineAt.toISOString(),
      miniGameKey: this.state.currentGameKey,
    });
  }

  private handleLiveCommand(command: LiveCommand) {
    if (command.sessionId !== this.sessionId) return;
    if (command.type === "start-round") {
      if (["BRIEFING", "ROUND_ACTIVE", "RESOLVING"].includes(this.state.phase)) {
        return;
      }
      const roundNum = command.roundNum || Math.max(1, this.currentRoundNum + 1);
      if (this.currentRoundNum >= roundNum && this.state.currentRoundId) {
        return;
      }
      this.state.phase = "BRIEFING";
      this.broadcast("brief.started", {
        sessionId: this.sessionId,
        roundNum,
        startsAtEpochMs: Date.now() + BRIEFING_DURATION_MS,
      });
      this.clock.setTimeout(() => {
        void this.beginRound(roundNum, command.durationMs ?? DEFAULT_ROUND_DURATION_MS);
      }, BRIEFING_DURATION_MS);
    }
  }

  private async closeCurrentRound(roundId: string) {
    if (this.state.currentRoundId !== roundId || this.state.phase !== "ROUND_ACTIVE") {
      return;
    }

    this.state.phase = "RESOLVING";
    const result = await closeAndFinalizeRound({
      sessionId: this.sessionId,
      roundId,
    });

    if (result.type === "resolved") {
      this.handleRoundResolved(result.payload);
      return;
    }

    if (result.type === "deadline-not-reached") {
      this.state.phase = "ROUND_ACTIVE";
      return;
    }

    console.error(`Round ${roundId} could not be finalized from room:`, result);
  }

  private handleRoundResolved(result: RoundResolvedPayload) {
    if (result.sessionId !== this.sessionId || this.resolvedRoundIds.has(result.roundId)) {
      return;
    }

    this.resolvedRoundIds.add(result.roundId);
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
    move: (client: LiveClient, message: MoveMessage) => {
      const userId = client.auth?.userId;
      if (!userId) return;
      const player = this.state.players.get(userId);
      if (!player || player.isEliminated) return;
      const x = typeof message.x === "number" ? message.x : player.x;
      const y = typeof message.y === "number" ? message.y : player.y;
      player.x = Math.max(40, Math.min(960, Math.round(x)));
      player.y = Math.max(56, Math.min(640, Math.round(y)));
      player.facing = typeof message.facing === "string" ? message.facing.slice(0, 16) : player.facing;
    },
    "chat.send": async (client: LiveClient, message: ChatMessage) => {
      const userId = client.auth?.userId;
      if (!userId) return;
      const player = this.state.players.get(userId);
      const body = typeof message.body === "string" ? message.body.trim().slice(0, 160) : "";
      if (!player || !body) return;
      player.chatBubble = body;
      player.chatBubbleUntil = Date.now() + 5_000;
      this.clock.setTimeout(() => {
        const p = this.state.players.get(userId);
        if (p && p.chatBubbleUntil <= Date.now()) p.chatBubble = "";
      }, 5_100);
      const saved = await recordSessionChatMessage({
        sessionId: this.sessionId,
        userId,
        type: message.quick ? "QUICK" : "CHAT",
        body,
        x: player.x,
        y: player.y,
      });
      this.broadcast("chat.message", {
        id: saved.id,
        userId,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        body,
        type: message.quick ? "QUICK" : "CHAT",
        createdAt: saved.createdAt.toISOString(),
      });
    },
    "ping.send": async (client: LiveClient, message: PingMessage) => {
      const userId = client.auth?.userId;
      if (!userId) return;
      const player = this.state.players.get(userId);
      if (!player) return;
      const pingType = typeof message.type === "string" ? message.type.slice(0, 24) : "here";
      const x = typeof message.x === "number" ? message.x : player.x;
      const y = typeof message.y === "number" ? message.y : player.y;
      player.lastPing = pingType;
      player.pingX = Math.max(40, Math.min(960, Math.round(x)));
      player.pingY = Math.max(56, Math.min(640, Math.round(y)));
      await recordSessionChatMessage({
        sessionId: this.sessionId,
        userId,
        type: "PING",
        body: pingType,
        x: player.pingX,
        y: player.pingY,
      });
      this.broadcast("ping.spawned", {
        userId,
        displayName: player.displayName,
        type: pingType,
        x: player.pingX,
        y: player.pingY,
        createdAt: new Date().toISOString(),
      });
    },
    "emote.send": (client: LiveClient, message: { emote?: string }) => {
      const userId = client.auth?.userId;
      if (!userId) return;
      const player = this.state.players.get(userId);
      if (!player) return;
      player.emote = typeof message.emote === "string" ? message.emote.slice(0, 24) : "";
      this.clock.setTimeout(() => {
        const p = this.state.players.get(userId);
        if (p) p.emote = "";
      }, 3_000);
    },
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
      this.placePlayer(player, this.state.players.size);
      this.state.players.set(userId, player);
    }
    return player;
  }

  private placePlayer(player: LivePlayer, index: number) {
    const columns = 4;
    player.x = 210 + (index % columns) * 180;
    player.y = 170 + Math.floor(index / columns) * 135;
    player.facing = "down";
  }

  private livePlayersForPublicState() {
    return [...this.state.players.values()]
      .filter((player) => !player.isEliminated)
      .map((player) => ({
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
