import { assertBootEnv } from "@session-jeu/config";
import { config } from "./config.js";
import { createGameServer } from "./create-server.js";
import { GameRoom } from "./rooms/GameRoom.js";

let gameServer: ReturnType<typeof createGameServer> | undefined;

if (process.env.NODE_ENV !== "test") {
  assertBootEnv("game-server");
  gameServer = createGameServer();
  gameServer.listen(config.port);
  console.log(`Game server listening on port ${config.port}`);
}

export { gameServer, GameRoom, createGameServer };
