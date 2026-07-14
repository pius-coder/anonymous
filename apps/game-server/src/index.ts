export type GameServerFoundation = {
  service: "game-server";
  foundation: "v0.1";
  realtimeContract: "protobuf-events-planned";
};

export function getGameServerFoundation(): GameServerFoundation {
  return {
    service: "game-server",
    foundation: "v0.1",
    realtimeContract: "protobuf-events-planned",
  };
}

if (process.env.NODE_ENV !== "test") {
  console.log("Game server foundation ready. Runtime implementation intentionally removed.");
}

