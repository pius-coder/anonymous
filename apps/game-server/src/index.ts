import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

const port = Number(process.env.GAME_PORT) || 2567;

const gameServer = new Server({
  transport: new WebSocketTransport({
    port,
  }),
});

console.log(`Game server starting on port ${port}`);

gameServer.listen(port).then(() => {
  console.log(`Game server listening on port ${port}`);
});
