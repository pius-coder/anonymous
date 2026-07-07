import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
