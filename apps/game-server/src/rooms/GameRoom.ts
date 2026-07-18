import { Room, Client, CloseCode } from "colyseus";
import { LiveRoomState } from "./schema/LiveRoomState.js";
import { validateLiveToken, type LiveAuthResult } from "../auth/live-auth.js";
import {
  addPlayer,
  type LiveAuthInfo,
  markDisconnected,
  markReconnected,
  removePlayer,
  persistConnected,
  persistDisconnect,
  persistReconnect,
  persistReconnecting,
} from "../handlers/connection-handler.js";
import { dispatchCommand, type CommandMessage } from "../handlers/command-dispatcher.js";
import {
  handleRoundCommandAsync,
  registerRoundHandlers,
} from "../handlers/round-handler.js";
import {
  getAdminSnapshot,
  getPlayerSnapshotForClient,
  getReadonlySnapshot,
  getSupportSnapshot,
  registerReadonlyHandlers,
} from "../handlers/readonly-handler.js";
import { applyMovementTick, registerMovementHandler } from "../handlers/movement-handler.js";
import { participationRepository, partyRepository, roundRepository } from "@session-jeu/db";
import {
  canRequestAdminSnapshot,
  canRequestReadonlySnapshot,
  canRequestSupportSnapshot,
  isPlayerRole,
} from "../auth/live-roles.js";
import { config } from "../config.js";
import { recordDrop, recordDuplicateInput, recordJoin, recordReconnect, recordReject } from "../metrics.js";
import { loadServerRoundSnapshot } from "./server-round-source.js";

/**
 * Join options accepted from the client.
 * Policy fields (reconnect timeout, max clients, round state) are NEVER taken from here.
 */
type GameRoomJoinOptions = {
  partyId?: string;
  connectionToken?: string;
  /** @deprecated Ignored — server config.reconnectTimeoutMs wins. */
  reconnectTimeout?: number | string;
  /** @deprecated Ignored — loaded from DB. */
  currentRoundId?: string;
  /** @deprecated Ignored — loaded from DB. */
  currentRoundNumber?: number | string;
  /** @deprecated Ignored — loaded from DB. */
  currentRoundStatus?: string;
  /** @deprecated Ignored — loaded from DB. */
  roundDeadlineAt?: number | string;
  /** @deprecated Ignored — config.maxClientsPerRoom wins. */
  maxClients?: number | string;
};

export class GameRoom extends Room<{ state: LiveRoomState }> {
  /** Authoritative reconnect window from server config (never from client options). */
  private reconnectTimeoutMs = config.reconnectTimeoutMs;
  private commandWindow = new Map<string, { startedAt: number; count: number }>();

  async onCreate(options: GameRoomJoinOptions = {}) {
    // Server policy — client cannot override.
    this.maxClients = config.maxClientsPerRoom;
    this.reconnectTimeoutMs = config.reconnectTimeoutMs;

    this.setState(new LiveRoomState());

    const partyId =
      typeof options.partyId === "string" && options.partyId.trim().length > 0
        ? options.partyId.trim()
        : "unknown";
    this.state.partyId = partyId;

    // Load round/status/deadline from persistence (authoritative), not from client options.
    const snapshot = await loadServerRoundSnapshot(partyId);
    this.applyServerSnapshot(snapshot);

    registerRoundHandlers();
    registerReadonlyHandlers();
    registerMovementHandler();
    this.setSimulationInterval((deltaMs) => applyMovementTick(this.state, deltaMs), 50);
    this.scheduleRoundDeadlineClose();

    this.onMessage("*", (client: Client, type: string | number, message: unknown) => {
      void this.handleClientMessage(client, type, message);
    });
  }

  private applyServerSnapshot(snapshot: Awaited<ReturnType<typeof loadServerRoundSnapshot>>): void {
    this.state.partyId = snapshot.partyId || this.state.partyId;
    this.state.partyStatus = snapshot.partyStatus;
    this.state.currentRoundId = snapshot.currentRoundId;
    this.state.currentRoundNumber = snapshot.currentRoundNumber;
    this.state.currentRoundStatus = snapshot.currentRoundStatus;
    this.state.roundDeadlineAt = snapshot.roundDeadlineAt;
  }

  private async handleClientMessage(
    client: Client,
    type: string | number,
    message: unknown,
  ): Promise<void> {
    if (this.isPayloadTooLarge(message)) {
      recordReject("PAYLOAD_TOO_LARGE");
      client.send("command:rejected", { type: String(type), error: "PAYLOAD_TOO_LARGE" });
      return;
    }

    if (!this.consumeMessageBudget(client)) {
      recordReject("RATE_LIMITED");
      client.send("command:rejected", { type: String(type), error: "RATE_LIMITED" });
      return;
    }

    const command: CommandMessage = {
      type: String(type),
      payload:
        message && typeof message === "object"
          ? (message as Record<string, unknown>)
          : {},
    };

    let result: { accepted: boolean; error?: string; acknowledge?: boolean; idempotent?: boolean };

    if (command.type === "round:submit" || command.type === "round:finish") {
      result = await handleRoundCommandAsync(this.state, client, command);
    } else {
      result = dispatchCommand(this.state, client, command);
    }

    if (!result.accepted) {
      if (result.error) {
        recordReject(result.error);
      }
      client.send("command:rejected", { type: command.type, error: result.error });
    } else if (result.acknowledge !== false) {
      if (result.idempotent) {
        recordDuplicateInput();
      }
      client.send("command:accepted", {
        type: command.type,
        idempotent: result.idempotent === true,
      });
    }
  }

  async onAuth(
    _client: Client,
    options: { connectionToken?: string; partyId?: string },
  ): Promise<LiveAuthResult> {
    if (!options.connectionToken) {
      throw new Error("MISSING_TOKEN");
    }
    const result = await validateLiveToken(options.connectionToken);
    if (!result.valid) {
      throw new Error(result.reason ?? "LIVE_AUTH_REJECTED");
    }
    if (options.partyId && result.partyId !== options.partyId) {
      throw new Error("PARTY_MISMATCH");
    }
    if (
      this.state.partyId &&
      this.state.partyId !== "unknown" &&
      result.partyId !== this.state.partyId
    ) {
      throw new Error("PARTY_MISMATCH");
    }
    return result;
  }

  async onJoin(client: Client, options: GameRoomJoinOptions, auth: LiveAuthResult) {
    addPlayer(this.state, client, {
      participationId: auth.participationId!,
      partyId: auth.partyId!,
      userId: auth.userId!,
      role: auth.role!,
      connectionToken: options.connectionToken!,
      participationStatus: auth.participationStatus,
    });
    try {
      await persistConnected(auth.participationId);
    } catch (error) {
      removePlayer(this.state, client);
      throw new Error(
        `LIVE_PERSISTENCE_FAILED:${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    recordJoin();

    client.send("player:connected", {
      sessionId: client.sessionId,
      role: auth.role,
      partyId: auth.partyId,
      // Policy is always server-reported (never client-supplied).
      reconnectTimeoutMs: this.reconnectTimeoutMs,
      maxClients: this.maxClients,
      currentRoundId: this.state.currentRoundId,
      currentRoundStatus: this.state.currentRoundStatus,
      roundDeadlineAt: this.state.roundDeadlineAt,
    });

    this.sendAudienceSnapshot(client, auth.role!);
  }

  async onLeave(client: Client, code?: number) {
    if (code !== undefined && code !== CloseCode.CONSENTED) {
      markDisconnected(this.state, client);
      try {
        await persistReconnecting(getParticipationId(client));
        // Timeout from server config only (milliseconds → seconds for Colyseus API).
        const reconnectionTimeoutSec = Math.max(1, Math.floor(this.reconnectTimeoutMs / 1000));
        await this.allowReconnection(client, reconnectionTimeoutSec);
        markReconnected(this.state, client);
        await persistReconnect(getParticipationId(client));
        recordReconnect();
        client.send("player:reconnected", {
          sessionId: client.sessionId,
          currentRoundId: this.state.currentRoundId,
          currentRoundStatus: this.state.currentRoundStatus,
          roundDeadlineAt: this.state.roundDeadlineAt,
          partyStatus: this.state.partyStatus,
        });
        const role = (client.userData as Partial<LiveAuthInfo> | undefined)?.role;
        if (role) this.sendAudienceSnapshot(client, role);
        return;
      } catch (error) {
        console.error("live reconnect failed", {
          roomId: this.roomId,
          participationId: getParticipationId(client),
          error: error instanceof Error ? error.message : "unknown error",
        });
        // Timed out or reconnection persistence failed; fall through to final disconnect cleanup.
      }
    }

    removePlayer(this.state, client);
    await persistDisconnect(getParticipationId(client));
    this.commandWindow.delete(getParticipationId(client) ?? client.sessionId);
    recordDrop();
  }

  onDispose() {
    this.state.players.clear();
    this.state.acceptedActionNonces.clear();
    this.commandWindow.clear();
  }

  private sendAudienceSnapshot(client: Client, role: string): void {
    if (canRequestAdminSnapshot(role)) {
      client.send("snapshot:admin", getAdminSnapshot(this.state));
      return;
    }
    if (canRequestSupportSnapshot(role)) {
      client.send("snapshot:support", getSupportSnapshot(this.state));
      return;
    }
    if (canRequestReadonlySnapshot(role) && !isPlayerRole(role)) {
      client.send("snapshot:readonly", getReadonlySnapshot(this.state));
      return;
    }
    if (isPlayerRole(role)) {
      const snap = getPlayerSnapshotForClient(this.state, client);
      if (snap) client.send("snapshot:player", snap);
    }
  }

  private scheduleRoundDeadlineClose(): void {
    if (this.state.currentRoundStatus !== "active" || this.state.roundDeadlineAt <= 0) {
      return;
    }

    const delayMs = Math.max(0, this.state.roundDeadlineAt - Date.now());
    this.clock.setTimeout(() => {
      void this.closeRoundAtDeadline();
    }, delayMs);
  }

  private async closeRoundAtDeadline(): Promise<void> {
    if (this.state.currentRoundStatus !== "active") return;

    const roundId = this.state.currentRoundId;
    const now = new Date();

    try {
      if (roundId) {
        const claimed = await roundRepository.claimDueRoundDeadline(roundId, now);
        if (!claimed) return;

        await roundRepository.updateRoundLifecycle(roundId, { status: "VERIFICATION" });
        if (this.state.partyId) {
          await partyRepository.updatePartyStatus(this.state.partyId, "ROUND_VERIFICATION");
        }
        const participants = await roundRepository.listRoundParticipants(roundId);
        await roundRepository.markRoundParticipantsWaitingReview(roundId);
        await Promise.all(
          participants.map(async (participant: { participationId: string }) => {
            await participationRepository.updateParticipationStatus(
              participant.participationId,
              "WAITING_REVIEW",
            );
          }),
        );
      }

      this.state.currentRoundStatus = "verification";
      this.broadcast("round:closed", {
        roundId,
        reason: "DEADLINE_REACHED",
      });
    } catch (error) {
      console.error("round deadline close failed", {
        roomId: this.roomId,
        roundId,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  private isPayloadTooLarge(message: unknown): boolean {
    const serialized =
      typeof message === "string" ? message : JSON.stringify(message ?? {});
    return Buffer.byteLength(serialized, "utf8") > config.maxPayloadBytes;
  }

  private consumeMessageBudget(client: Client): boolean {
    const now = Date.now();
    const key = getParticipationId(client) ?? client.sessionId;
    const entry = this.commandWindow.get(key);

    if (!entry || now - entry.startedAt >= config.messageWindowMs) {
      this.commandWindow.set(key, { startedAt: now, count: 1 });
      return true;
    }

    entry.count += 1;
    if (entry.count > config.maxMessagesPerWindow) {
      return false;
    }

    return true;
  }
}

function getParticipationId(client: Client): string | undefined {
  return (client.userData as Partial<LiveAuthInfo> | undefined)?.participationId;
}
