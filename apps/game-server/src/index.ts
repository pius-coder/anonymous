import { defineServer, defineRoom } from "colyseus";
import { GameSessionRoom } from "./rooms/GameSessionRoom.js";

const port = Number(process.env.GAME_PORT) || 2567;

const server = defineServer({
  rooms: {
    game_session: defineRoom(GameSessionRoom),
  },
});

server.listen(port);
console.log(`Game server listening on port ${port}`);
