import { Server, RedisDriver, RedisPresence, WebSocketTransport } from "colyseus";
import { config } from "./config.js";
import { GameRoom } from "./rooms/GameRoom.js";

/**
 * Build a Colyseus Server with the game_room definition.
 * Used by production entry and @colyseus/testing boot.
 */
export function createGameServer(options?: { presence?: "redis" | "local" | "none" }): Server {
  const presenceMode = options?.presence ?? config.presence;
  const useRedis = presenceMode === "redis";
  const gameServer = new Server({
    gracefullyShutdown: false,
    presence: useRedis ? new RedisPresence(config.redisUrl) : undefined,
    driver: useRedis ? new RedisDriver(config.redisUrl) : undefined,
    transport: new WebSocketTransport({
      pingInterval: config.pingIntervalMs,
      pingMaxRetries: config.pingMaxRetries,
      maxPayload: config.maxPayloadBytes,
      verifyClient: (info, callback) => {
        if (!config.isOriginAllowed(info.origin)) {
          callback(false, 403, "FORBIDDEN_ORIGIN");
          return;
        }
        callback(true);
      },
    }),
  });
  gameServer.define("game_room", GameRoom).filterBy(["partyId"]);
  return gameServer;
}
