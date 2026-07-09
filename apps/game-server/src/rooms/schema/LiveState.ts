import { MapSchema, Schema, type } from "@colyseus/schema";

export class LivePlayer extends Schema {
  @type("string") userId: string = "";
  @type("string") displayName: string = "";
  @type("string") connectionStatus: string = "DISCONNECTED";
  @type("boolean") submittedAction: boolean = false;
  @type("boolean") isEliminated: boolean = false;
}

export class LiveRoomState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") phase: string = "BRIEFING";
  @type("string") roomId: string = "";
  @type("string") currentRoundId: string = "";
  @type("number") roundNum: number = 0;
  @type("number") deadlineEpochMs: number = 0;
  @type("number") maxRounds: number = 3;
  @type("string") sessionStatus: string = "PLAYING";
  @type({ map: LivePlayer }) players = new MapSchema<LivePlayer>();
}
