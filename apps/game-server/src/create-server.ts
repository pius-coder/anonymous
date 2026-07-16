import { Server, RedisPresence } from "colyseus";
import { config } from "./config.js";
import { GameRoom } from "./rooms/GameRoom.js";

/**
 * Build a Colyseus Server with the game_room definition.
 * Used by production entry and @colyseus/testing boot.
 */
export function createGameServer(options?: { presence?: "redis" | "local" | "none" }): Server {
  const presenceMode = options?.presence ?? config.presence;
  const gameServer = new Server({
    presence:
      presenceMode === "redis" ? new RedisPresence(config.redisUrl) : undefined,
  });
  gameServer.define("game_room", GameRoom).filterBy(["partyId"]);
  return gameServer;
}
