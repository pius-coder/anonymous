import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") sessionId = "";
  userId = "";
  participationId = "";
  role = "";
  previousStatus = "";
  @type("boolean") connected = false;
  @type("string") status = "pending";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") facing = "down";
  @type("boolean") moving = false;
  @type("number") lastProcessedInputSequence = 0;

  pendingInput?: { sequence: number; x: number; y: number };
}

export class LiveRoomState extends Schema {
  @type("string") partyId = "";
  @type("string") partyStatus = "";
  @type("number") connectedCount = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();

  @type("string") currentRoundStatus = "";
  @type("number") currentRoundNumber = 0;
  @type("string") currentRoundId = "";
  @type("number") roundDeadlineAt = 0;
}
