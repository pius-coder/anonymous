import { defineServer, defineRoom } from "colyseus";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number(process.env.GAME_PORT) || 2567;

const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom),
  },
});

server.listen(port);
console.log(`Game server listening on port ${port}`);
