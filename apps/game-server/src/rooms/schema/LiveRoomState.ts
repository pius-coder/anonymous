import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") sessionId = "";
  userId = "";
  participationId = "";
  role = "";
  @type("boolean") connected = false;
  @type("string") status = "pending";
}

export class LiveRoomState extends Schema {
  @type("string") partyId = "";
  @type("string") partyStatus = "";
  @type("number") connectedCount = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();

  @type("string") currentRoundStatus = "";
  @type("number") currentRoundNumber = 0;
}
