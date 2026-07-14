import { describe, expect, it } from "vitest";
import { getGameServerFoundation } from "../index.js";

describe("game-server foundation", () => {
  it("keeps only the realtime foundation marker", () => {
    expect(getGameServerFoundation()).toEqual({
      service: "game-server",
      foundation: "v0.1",
      realtimeContract: "protobuf-events-planned",
    });
  });
});

