import { createHash } from "node:crypto";
import { Client, Room } from "colyseus";
import type { Prisma } from "@session-jeu/db";
import { LiveGroup, LivePlayer, LiveRoomState } from "./schema/LiveState.js";
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

type ChatChannel = "GLOBAL" | "PRIVATE" | "GROUP";

type ChatMessage = {
  body?: string;
  quick?: boolean;
  channel?: ChatChannel;
  targetUserId?: string;
  groupId?: string;
};

type PingMessage = {
  type?: string;
  x?: number;
  y?: number;
};

type GroupCreateMessage = { name?: string };
type GroupApplyMessage = { groupId?: string };
type GroupInviteMessage = { groupId?: string; targetUserId?: string };
type GroupResolveMessage = { requestId?: string; decision?: "ACCEPTED" | "REFUSED" };
type GroupLockMessage = { groupId?: string; locked?: boolean };

type SocialRequest = {
  id: string;
  kind: "INVITATION" | "APPLICATION";
  fromUserId: string;
  toUserId: string;
  groupId: string;
  status: "PENDING" | "ACCEPTED" | "REFUSED" | "EXPIRED";
  createdAtEpochMs: number;
  expiresAtEpochMs: number;
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
  private socialRequests = new Map<string, SocialRequest>();
  private socialRequestCounter = 0;
  private lastChatAtByUser = new Map<string, number>();
  private privateRoundRoles = new Map<string, "IMPOSTOR" | "CITIZEN">();

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

    this.seedSocialGroups();

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
    client.send("social.requests", { requests: this.requestsForUser(auth.userId) });
    if (this.state.currentRoundId && this.state.currentGameKey) {
      client.send("round.game", this.buildRoundGameMessage());
      this.sendPrivateRoundState(auth.userId);
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
    const activeParticipantIds = new Set<string>(result.participants.map((participant: { userId: string }) => participant.userId));
    for (const player of this.state.players.values()) {
      player.submittedAction = false;
      if (!activeParticipantIds.has(player.userId)) {
        player.isEliminated = true;
      }
    }

    this.clock.setTimeout(() => {
      void this.closeCurrentRound(result.round.id);
    }, Math.max(0, result.deadline.deadlineAt.getTime() - Date.now()));

    this.preparePrivateRoundState([...activeParticipantIds]);
    this.broadcast("round.game", this.buildRoundGameMessage());
    for (const userId of activeParticipantIds) this.sendPrivateRoundState(userId);
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
      if (player.isEliminated && ["ROUND_ACTIVE", "RESOLVING"].includes(this.state.phase)) {
        client.send("chat.rejected", { reason: "spectator-chat-locked" });
        return;
      }

      const nowMs = Date.now();
      const lastChatAt = this.lastChatAtByUser.get(userId) ?? 0;
      if (nowMs - lastChatAt < 450) {
        client.send("chat.rejected", { reason: "cooldown" });
        return;
      }
      this.lastChatAtByUser.set(userId, nowMs);

      const channel: ChatChannel = message.channel === "PRIVATE" || message.channel === "GROUP"
        ? message.channel
        : "GLOBAL";
      let targetUserId: string | undefined;
      let groupId: string | undefined;
      let recipientIds: string[] | null = null;

      if (channel === "PRIVATE") {
        targetUserId = typeof message.targetUserId === "string" ? message.targetUserId : undefined;
        if (!targetUserId || targetUserId === userId || !this.state.players.has(targetUserId)) {
          client.send("chat.rejected", { reason: "invalid-recipient" });
          return;
        }
        recipientIds = [userId, targetUserId];
      }

      if (channel === "GROUP") {
        groupId = player.socialGroupId || (typeof message.groupId === "string" ? message.groupId : undefined);
        const group = groupId ? this.state.groups.get(groupId) : undefined;
        if (!group || !group.memberIds.includes(userId)) {
          client.send("chat.rejected", { reason: "group-required" });
          return;
        }
        groupId = group.id;
        recipientIds = [...group.memberIds];
      }

      if (channel === "GLOBAL") {
        player.chatBubble = body;
        player.chatBubbleUntil = nowMs + 5_000;
        this.clock.setTimeout(() => {
          const current = this.state.players.get(userId);
          if (current && current.chatBubbleUntil <= Date.now()) current.chatBubble = "";
        }, 5_100);
      }

      const saved = await recordSessionChatMessage({
        sessionId: this.sessionId,
        userId,
        type: message.quick ? "QUICK" : "CHAT",
        body,
        x: player.x,
        y: player.y,
      });
      const payload = {
        id: saved.id,
        userId,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        body,
        type: message.quick ? "QUICK" : "CHAT",
        channel,
        targetUserId,
        groupId,
        threadId: channel === "PRIVATE"
          ? [userId, targetUserId].sort().join(":")
          : channel === "GROUP"
            ? groupId
            : "global",
        createdAt: saved.createdAt.toISOString(),
      };

      if (recipientIds) this.sendToUsers(recipientIds, "chat.message", payload);
      else this.broadcast("chat.message", payload);
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
    "group.create": (client: LiveClient, message: GroupCreateMessage = {}) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      const player = userId ? this.state.players.get(userId) : undefined;
      if (!userId || !player) return;
      if (player.socialGroupId) {
        client.send("group.rejected", { reason: "already-in-group" });
        return;
      }
      const group = this.createSocialGroup(userId, message.name);
      client.send("group.accepted", { type: "created", groupId: group.id });
    },
    "group.apply": (client: LiveClient, message: GroupApplyMessage = {}) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      const player = userId ? this.state.players.get(userId) : undefined;
      const group = typeof message.groupId === "string" ? this.state.groups.get(message.groupId) : undefined;
      if (!userId || !player || !group) {
        client.send("group.rejected", { reason: "group-not-found" });
        return;
      }
      if (player.socialGroupId) {
        client.send("group.rejected", { reason: "already-in-group" });
        return;
      }
      if (group.locked || group.memberIds.length >= group.maxMembers) {
        client.send("group.rejected", { reason: "group-unavailable" });
        return;
      }
      const pending = [...this.socialRequests.values()].filter((request) =>
        request.kind === "APPLICATION" && request.fromUserId === userId && request.status === "PENDING",
      );
      if (pending.length >= 2) {
        client.send("group.rejected", { reason: "application-limit" });
        return;
      }
      const duplicate = pending.some((request) => request.groupId === group.id);
      if (duplicate) {
        client.send("group.rejected", { reason: "already-applied" });
        return;
      }
      this.createSocialRequest({
        kind: "APPLICATION",
        fromUserId: userId,
        toUserId: group.leaderId,
        groupId: group.id,
      });
    },
    "group.invite": (client: LiveClient, message: GroupInviteMessage = {}) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      const group = typeof message.groupId === "string" ? this.state.groups.get(message.groupId) : undefined;
      const target = typeof message.targetUserId === "string" ? this.state.players.get(message.targetUserId) : undefined;
      if (!userId || !group || group.leaderId !== userId || !target) {
        client.send("group.rejected", { reason: "not-authorized" });
        return;
      }
      if (group.locked || group.memberIds.length >= group.maxMembers || target.socialGroupId) {
        client.send("group.rejected", { reason: "target-unavailable" });
        return;
      }
      const duplicate = [...this.socialRequests.values()].some((request) =>
        request.kind === "INVITATION" && request.groupId === group.id &&
        request.toUserId === target.userId && request.status === "PENDING",
      );
      if (duplicate) {
        client.send("group.rejected", { reason: "already-invited" });
        return;
      }
      this.createSocialRequest({
        kind: "INVITATION",
        fromUserId: userId,
        toUserId: target.userId,
        groupId: group.id,
      });
    },
    "group.request.resolve": (client: LiveClient, message: GroupResolveMessage = {}) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      const request = typeof message.requestId === "string" ? this.socialRequests.get(message.requestId) : undefined;
      const decision = message.decision;
      if (!userId || !request || request.status !== "PENDING" || (decision !== "ACCEPTED" && decision !== "REFUSED")) {
        client.send("group.rejected", { reason: "request-not-found" });
        return;
      }
      if (request.toUserId !== userId) {
        client.send("group.rejected", { reason: "not-authorized" });
        return;
      }
      let memberId: string | null = null;
      if (decision === "ACCEPTED") {
        memberId = request.kind === "APPLICATION" ? request.fromUserId : request.toUserId;
        const accepted = this.addMemberToGroup(request.groupId, memberId);
        if (!accepted) {
          client.send("group.rejected", { reason: "group-unavailable" });
          return;
        }
      }
      this.updateSocialRequest(request, decision);
      if (memberId) this.expireOtherRequestsForMember(memberId, request.id);
    },
    "group.leave": (client: LiveClient) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      if (!userId) return;
      this.removeMemberFromSocialGroup(userId);
    },
    "group.lock": (client: LiveClient, message: GroupLockMessage = {}) => {
      if (!this.socialMutationsAllowed()) {
        client.send("group.rejected", { reason: "round-in-progress" });
        return;
      }
      const userId = client.auth?.userId;
      const group = typeof message.groupId === "string" ? this.state.groups.get(message.groupId) : undefined;
      if (!userId || !group || group.leaderId !== userId) {
        client.send("group.rejected", { reason: "not-authorized" });
        return;
      }
      group.locked = Boolean(message.locked);
      this.broadcast("group.updated", { groupId: group.id, locked: group.locked });
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

  private preparePrivateRoundState(activeParticipantIds: string[]) {
    this.privateRoundRoles.clear();
    if (this.state.currentGameKey !== "silent-vote" || activeParticipantIds.length === 0) return;
    const ranked = [...activeParticipantIds].sort((a, b) => {
      const digestA = createHash("sha256").update(`${this.state.currentRoundId}:${a}`).digest("hex");
      const digestB = createHash("sha256").update(`${this.state.currentRoundId}:${b}`).digest("hex");
      return digestA.localeCompare(digestB);
    });
    const hiddenCount = Math.max(1, Math.floor(activeParticipantIds.length / 8));
    const hiddenIds = new Set(ranked.slice(0, hiddenCount));
    for (const userId of activeParticipantIds) {
      this.privateRoundRoles.set(userId, hiddenIds.has(userId) ? "IMPOSTOR" : "CITIZEN");
    }
  }

  private sendPrivateRoundState(userId: string) {
    if (this.state.currentGameKey !== "silent-vote") return;
    const role = this.privateRoundRoles.get(userId);
    if (!role) return;
    this.sendToUser(userId, "role.assigned", {
      roundId: this.state.currentRoundId,
      role,
      objective: role === "IMPOSTOR"
        ? "Reste crédible et détourne le vote sans révéler ton rôle."
        : "Observe les contradictions et vote sans exposer tes indices privés.",
    });
  }

  private socialMutationsAllowed() {
    return !["ROUND_ACTIVE", "RESOLVING", "RESULTS"].includes(this.state.phase);
  }

  private seedSocialGroups() {
    if (this.state.groups.size > 0 || this.state.players.size === 0) return;
    const presets = [
      { name: "Les Survivants", accent: "pink", x: 255, y: 205 },
      { name: "Team Phoenix", accent: "teal", x: 745, y: 205 },
      { name: "Alliance Z", accent: "gold", x: 270, y: 520 },
      { name: "Nomades", accent: "violet", x: 730, y: 520 },
    ];
    const playerIds = [...this.state.players.keys()];
    const groupCount = Math.min(presets.length, Math.max(1, Math.ceil(playerIds.length / 4)));
    for (let index = 0; index < groupCount; index += 1) {
      const leaderId = playerIds[index];
      if (!leaderId) break;
      const preset = presets[index];
      const group = new LiveGroup();
      group.id = `group-${index + 1}`;
      group.name = preset.name;
      group.leaderId = leaderId;
      group.memberIds.push(leaderId);
      group.maxMembers = 4;
      group.accent = preset.accent;
      group.zoneX = preset.x;
      group.zoneY = preset.y;
      group.zoneRadius = 108;
      this.state.groups.set(group.id, group);
      const leader = this.state.players.get(leaderId);
      if (leader) {
        leader.socialGroupId = group.id;
        leader.socialRole = "LEADER";
        leader.x = preset.x;
        leader.y = preset.y;
      }
    }
  }

  private createSocialGroup(leaderId: string, rawName?: string) {
    const index = this.state.groups.size;
    const accents = ["pink", "teal", "gold", "violet"];
    const positions = [
      { x: 255, y: 205 },
      { x: 745, y: 205 },
      { x: 270, y: 520 },
      { x: 730, y: 520 },
      { x: 500, y: 350 },
    ];
    const group = new LiveGroup();
    group.id = `group-${Date.now().toString(36)}-${index + 1}`;
    const cleaned = typeof rawName === "string" ? rawName.trim().replace(/\s+/g, " ").slice(0, 28) : "";
    group.name = cleaned || `Escouade ${index + 1}`;
    group.leaderId = leaderId;
    group.memberIds.push(leaderId);
    group.maxMembers = 4;
    group.accent = accents[index % accents.length];
    const position = positions[index % positions.length];
    group.zoneX = position.x;
    group.zoneY = position.y;
    group.zoneRadius = 108;
    this.state.groups.set(group.id, group);
    const leader = this.state.players.get(leaderId);
    if (leader) {
      leader.socialGroupId = group.id;
      leader.socialRole = "LEADER";
    }
    this.broadcast("group.updated", { groupId: group.id, type: "created" });
    return group;
  }

  private createSocialRequest(input: Pick<SocialRequest, "kind" | "fromUserId" | "toUserId" | "groupId">) {
    const now = Date.now();
    const request: SocialRequest = {
      ...input,
      id: `request-${now.toString(36)}-${++this.socialRequestCounter}`,
      status: "PENDING",
      createdAtEpochMs: now,
      expiresAtEpochMs: now + 60_000,
    };
    this.socialRequests.set(request.id, request);
    this.sendToUser(request.fromUserId, "social.request.created", request);
    this.sendToUser(request.toUserId, "social.request.created", request);
    this.clock.setTimeout(() => {
      const current = this.socialRequests.get(request.id);
      if (!current || current.status !== "PENDING") return;
      this.updateSocialRequest(current, "EXPIRED");
    }, 60_100);
    return request;
  }

  private updateSocialRequest(request: SocialRequest, status: SocialRequest["status"]) {
    request.status = status;
    this.socialRequests.set(request.id, request);
    this.sendToUser(request.fromUserId, "social.request.updated", request);
    this.sendToUser(request.toUserId, "social.request.updated", request);
    if (status !== "PENDING") {
      this.clock.setTimeout(() => {
        const current = this.socialRequests.get(request.id);
        if (!current || current.status === "PENDING") return;
        this.socialRequests.delete(request.id);
        this.sendToUser(current.fromUserId, "social.request.removed", { requestId: current.id });
        this.sendToUser(current.toUserId, "social.request.removed", { requestId: current.id });
      }, 5 * 60_000);
    }
  }

  private requestsForUser(userId: string) {
    return [...this.socialRequests.values()].filter((request) =>
      request.fromUserId === userId || request.toUserId === userId,
    );
  }

  private expireOtherRequestsForMember(userId: string, acceptedRequestId: string) {
    for (const request of this.socialRequests.values()) {
      if (request.id === acceptedRequestId || request.status !== "PENDING") continue;
      const concernsMember = request.kind === "APPLICATION"
        ? request.fromUserId === userId
        : request.toUserId === userId;
      if (concernsMember) this.updateSocialRequest(request, "EXPIRED");
    }
  }

  private sendToUser(userId: string, type: string, payload: unknown) {
    this.sendToUsers([userId], type, payload);
  }

  private sendToUsers(userIds: Iterable<string>, type: string, payload: unknown) {
    const allowed = new Set(userIds);
    for (const client of this.clients) {
      const clientUserId = (client as LiveClient).auth?.userId;
      if (clientUserId && allowed.has(clientUserId)) client.send(type, payload);
    }
  }

  private addMemberToGroup(groupId: string, userId: string) {
    const group = this.state.groups.get(groupId);
    const player = this.state.players.get(userId);
    if (!group || !player || player.socialGroupId || group.locked || group.memberIds.length >= group.maxMembers) {
      return false;
    }
    group.memberIds.push(userId);
    player.socialGroupId = group.id;
    player.socialRole = "MEMBER";
    player.x = Math.max(40, Math.min(960, group.zoneX + (group.memberIds.length - 1) * 28));
    player.y = Math.max(56, Math.min(640, group.zoneY + (group.memberIds.length % 2 === 0 ? 32 : -28)));
    this.broadcast("group.updated", { groupId: group.id, type: "member-added", userId });
    return true;
  }

  private removeMemberFromSocialGroup(userId: string) {
    const player = this.state.players.get(userId);
    if (!player?.socialGroupId) return;
    const group = this.state.groups.get(player.socialGroupId);
    player.socialGroupId = "";
    player.socialRole = "NONE";
    if (!group) return;
    const remaining = [...group.memberIds].filter((memberId) => memberId !== userId);
    group.memberIds.splice(0, group.memberIds.length, ...remaining);
    if (group.leaderId === userId) {
      const nextLeaderId = remaining[0];
      if (!nextLeaderId) {
        for (const request of this.socialRequests.values()) {
          if (request.groupId === group.id && request.status === "PENDING") {
            this.updateSocialRequest(request, "EXPIRED");
          }
        }
        this.state.groups.delete(group.id);
        this.broadcast("group.updated", { groupId: group.id, type: "deleted" });
        return;
      }
      group.leaderId = nextLeaderId;
      const nextLeader = this.state.players.get(nextLeaderId);
      if (nextLeader) nextLeader.socialRole = "LEADER";
      for (const request of this.socialRequests.values()) {
        if (request.groupId !== group.id || request.status !== "PENDING") continue;
        if (request.kind === "APPLICATION") {
          const previousRecipient = request.toUserId;
          request.toUserId = nextLeaderId;
          this.sendToUser(previousRecipient, "social.request.removed", { requestId: request.id });
          this.sendToUser(request.fromUserId, "social.request.updated", request);
          this.sendToUser(nextLeaderId, "social.request.created", request);
        } else if (request.kind === "INVITATION" && request.fromUserId === userId) {
          const previousSender = request.fromUserId;
          request.fromUserId = nextLeaderId;
          this.sendToUser(previousSender, "social.request.removed", { requestId: request.id });
          this.sendToUser(request.toUserId, "social.request.updated", request);
          this.sendToUser(nextLeaderId, "social.request.created", request);
        }
      }
    }
    this.broadcast("group.updated", { groupId: group.id, type: "member-removed", userId });
  }

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
