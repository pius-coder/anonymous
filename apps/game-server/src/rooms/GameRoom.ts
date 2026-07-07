import { Room, Client } from "colyseus";
import { GameState, Player } from "./schema/GameState.js";

export class GameRoom extends Room {
  maxClients = 4;

  state = new GameState();

  messages = {
    move: (client: Client, payload: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = payload.x;
        player.y = payload.y;
      }
    },
  };

  onCreate() {
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new Player();
    player.name = (options.name as string) || `Player ${this.state.players.size + 1}`;
    this.state.players.set(client.sessionId, player);
    console.log(`${client.sessionId} joined as ${player.name}`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    console.log(`${client.sessionId} left`);
  }

  onDispose() {
    console.log("GameRoom disposed");
  }

  update(_deltaTime: number) {
    // Game loop — implement physics/world updates here
  }
}
