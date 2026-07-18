import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import type { CommandMessage } from "./command-dispatcher.js";
import { registerCommandHandler } from "./command-dispatcher.js";
import {
  canRequestAdminSnapshot,
  canRequestReadonlySnapshot,
  canRequestSupportSnapshot,
  isPlayerRole,
} from "../auth/live-roles.js";
import {
  getAdminSnapshot,
  getPlayerSnapshotForClient,
  getReadonlySnapshot,
  getSupportSnapshot,
} from "../projections/live-projections.js";

export * from "../projections/live-projections.js";

function handleSnapshotRequest(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): { accepted: boolean; error?: string } {
  const player = state.players.get(client.sessionId);
  if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

  const audience = command.payload?.audience as string | undefined;

  if (audience === "admin" && !canRequestAdminSnapshot(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  if (audience === "support" && !canRequestSupportSnapshot(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  if (audience === "observer" && !canRequestReadonlySnapshot(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  if (audience === "admin") {
    client.send("snapshot:admin", getAdminSnapshot(state));
  } else if (audience === "support") {
    client.send("snapshot:support", getSupportSnapshot(state));
  } else if (audience === "observer") {
    client.send("snapshot:readonly", getReadonlySnapshot(state));
  } else {
    if (!isPlayerRole(player.role)) {
      return { accepted: false, error: "ROLE_NOT_ALLOWED" };
    }
    const snap = getPlayerSnapshotForClient(state, client);
    if (snap) client.send("snapshot:player", snap);
  }

  return { accepted: true };
}

export function registerReadonlyHandlers(): void {
  registerCommandHandler("snapshot:request", handleSnapshotRequest);
}
