import { Server, RedisPresence } from "colyseus";
import { config } from "./config.js";
import { GameRoom } from "./rooms/GameRoom.js";

let gameServer: Server | undefined;

if (process.env.NODE_ENV !== "test") {
  gameServer = new Server({
    presence: config.presence === "redis"
      ? new RedisPresence(config.redisUrl)
      : undefined,
  });

  gameServer.define("game_room", GameRoom);
  gameServer.listen(config.port);
  console.log(`Game server listening on port ${config.port}`);
}

export { gameServer, GameRoom };
