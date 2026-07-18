import { assertBootEnv } from "@session-jeu/config";
import { config } from "./config.js";
import { createGameServer } from "./create-server.js";
import { getMetrics } from "./metrics.js";
import { GameRoom } from "./rooms/GameRoom.js";
import { assertGameServerReadiness } from "./runtime/readiness.js";

let gameServer: ReturnType<typeof createGameServer> | undefined;
let shuttingDown = false;

export async function startGameServer(): Promise<ReturnType<typeof createGameServer>> {
  if (gameServer) return gameServer;
  assertBootEnv("game-server");
  const readiness = await assertGameServerReadiness();
  gameServer = createGameServer();
  gameServer.onBeforeShutdown(() => {
    console.info("game-server shutting down", { port: config.port, metrics: getMetrics() });
  });
  gameServer.onShutdown(() => {
    console.info("game-server stopped", { port: config.port, metrics: getMetrics() });
  });
  await gameServer.listen(config.port);
  console.info("game-server ready", { port: config.port, readiness });
  return gameServer;
}

export async function stopGameServer(): Promise<void> {
  if (!gameServer || shuttingDown) return;
  shuttingDown = true;
  try {
    await gameServer.gracefullyShutdown(false);
  } finally {
    gameServer = undefined;
    shuttingDown = false;
  }
}

if (process.env.NODE_ENV !== "test") {
  void startGameServer();

  const handleSignal = (signal: string) => {
    console.info("signal received", { signal });
    void stopGameServer().finally(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", () => handleSignal("SIGINT"));
  process.once("SIGTERM", () => handleSignal("SIGTERM"));
}

export { gameServer, GameRoom, createGameServer };
