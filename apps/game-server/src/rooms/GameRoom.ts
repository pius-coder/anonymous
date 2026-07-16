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
import { registerRoundHandlers } from "../handlers/round-handler.js";
import { registerReadonlyHandlers } from "../handlers/readonly-handler.js";
import { applyMovementTick, registerMovementHandler } from "../handlers/movement-handler.js";
import { participationRepository, partyRepository, roundRepository } from "@session-jeu/db";

type GameRoomOptions = {
  partyId?: string;
  reconnectTimeout?: number | string;
  connectionToken?: string;
  currentRoundId?: string;
  currentRoundNumber?: number | string;
  currentRoundStatus?: string;
  roundDeadlineAt?: number | string;
};

export class GameRoom extends Room<{ state: LiveRoomState }> {
  private reconnectTimeoutMs = 30_000;

  onCreate(options: GameRoomOptions = {}) {
    this.setState(new LiveRoomState());
    this.state.partyId = options.partyId || "unknown";
    this.reconnectTimeoutMs = Number(options.reconnectTimeout) || 30_000;
    this.state.currentRoundId = options.currentRoundId || "";
    this.state.currentRoundNumber = Number(options.currentRoundNumber) || 0;
    this.state.currentRoundStatus = options.currentRoundStatus || "";
    this.state.roundDeadlineAt = Number(options.roundDeadlineAt) || 0;

    registerRoundHandlers();
    registerReadonlyHandlers();
    registerMovementHandler();
    this.setSimulationInterval((deltaMs) => applyMovementTick(this.state, deltaMs), 50);
    this.scheduleRoundDeadlineClose();

    this.onMessage("*", (client: Client, type: string | number, message: unknown) => {
      const command: CommandMessage = {
        type: String(type),
        payload: message && typeof message === "object" ? message as Record<string, unknown> : {},
      };
      const result = dispatchCommand(this.state, client, command);
      if (!result.accepted) {
        client.send("command:rejected", { type: command.type, error: result.error });
      } else if (result.acknowledge !== false) {
        client.send("command:accepted", { type: command.type });
      }
    });
  }

  async onAuth(client: Client, options: { connectionToken?: string; partyId?: string }): Promise<LiveAuthResult> {
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
    return result;
  }

  onJoin(client: Client, options: GameRoomOptions, auth: LiveAuthResult) {
    addPlayer(this.state, client, {
      participationId: auth.participationId!,
      partyId: auth.partyId!,
      userId: auth.userId!,
      role: auth.role!,
      connectionToken: options.connectionToken!,
      participationStatus: auth.participationStatus,
    });
    void persistConnected(auth.participationId);

    client.send("player:connected", {
      sessionId: client.sessionId,
      role: auth.role,
      partyId: auth.partyId,
    });
  }

  async onLeave(client: Client, code?: number) {
    if (code !== undefined && code !== CloseCode.CONSENTED) {
      markDisconnected(this.state, client);
      await persistReconnecting(getParticipationId(client));
      try {
        const reconnectionTimeoutSec = Math.floor(this.reconnectTimeoutMs / 1000);
        await this.allowReconnection(client, reconnectionTimeoutSec);
        markReconnected(this.state, client);
        await persistReconnect(getParticipationId(client));
        client.send("player:reconnected", { sessionId: client.sessionId });
        return;
      } catch {
        // Timed out or reconnection was rejected; fall through to final disconnect cleanup.
      }
    }

    removePlayer(this.state, client);
    await persistDisconnect(getParticipationId(client));
  }

  onDispose() {
    this.state.players.clear();
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

    if (roundId) {
      const claimed = await roundRepository.claimDueRoundDeadline(roundId, now).catch(() => false);
      if (!claimed) return;

      await roundRepository.updateRoundLifecycle(roundId, { status: "VERIFICATION" });
      if (this.state.partyId) {
        await partyRepository.updatePartyStatus(this.state.partyId, "ROUND_VERIFICATION").catch(() => undefined);
      }
      const participants = await roundRepository.listRoundParticipants(roundId).catch(() => []);
      await roundRepository.markRoundParticipantsWaitingReview(roundId).catch(() => undefined);
      await Promise.all(participants.map(async (participant) => {
        await participationRepository.updateParticipationStatus(participant.participationId, "WAITING_REVIEW").catch(() => undefined);
      }));
    }

    this.state.currentRoundStatus = "verification";
    this.broadcast("round:closed", {
      roundId,
      reason: "DEADLINE_REACHED",
    });
  }
}

function getParticipationId(client: Client): string | undefined {
  return (client.userData as Partial<LiveAuthInfo> | undefined)?.participationId;
}
