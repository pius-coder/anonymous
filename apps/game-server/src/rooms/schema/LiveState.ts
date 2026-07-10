import { MapSchema, Schema, type } from "@colyseus/schema";

export class LivePlayer extends Schema {
  @type("string") userId: string = "";
  @type("string") displayName: string = "";
  @type("string") avatarUrl: string = "";
  @type("string") connectionStatus: string = "DISCONNECTED";
  @type("boolean") submittedAction: boolean = false;
  @type("boolean") isEliminated: boolean = false;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") facing: string = "down";
  @type("string") emote: string = "";
  @type("string") chatBubble: string = "";
  @type("number") chatBubbleUntil: number = 0;
  @type("string") lastPing: string = "";
  @type("number") pingX: number = 0;
  @type("number") pingY: number = 0;
  @type("string") teamId: string = "";
  @type("string") pairId: string = "";
  @type("string") role: string = "";
}

export class LiveRoomState extends Schema {
  @type("string") sessionId: string = "";
  @type("string") phase: string = "BRIEFING";
  @type("string") roomId: string = "";
  @type("string") currentRoundId: string = "";
  @type("string") currentGameKey: string = "";
  @type("string") currentGameFamily: string = "";
  @type("string") currentGameName: string = "";
  @type("number") roundNum: number = 0;
  @type("number") deadlineEpochMs: number = 0;
  @type("number") maxRounds: number = 3;
  @type("string") sessionStatus: string = "PLAYING";
  @type({ map: LivePlayer }) players = new MapSchema<LivePlayer>();
}
