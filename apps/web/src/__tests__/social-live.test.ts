import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("live social layer", () => {
  it("reads public groups from synchronized room state", () => {
    const hook = readFileSync("src/hooks/useGameRoom.ts", "utf-8");
    expect(hook).toContain("LiveSocialGroup");
    expect(hook).toContain("groups: valuesFromSchema");
    expect(hook).toContain("social.request.created");
    expect(hook).toContain("social.request.updated");
    expect(hook).toContain("social.request.removed");
  });

  it("uses targeted request messages instead of public request state", () => {
    const server = readFileSync("../game-server/src/rooms/GameSessionRoom.ts", "utf-8");
    const schema = readFileSync("../game-server/src/rooms/schema/LiveState.ts", "utf-8");
    expect(server).toContain('this.sendToUser(request.toUserId, "social.request.created"');
    expect(server).toContain('client.send("social.requests"');
    expect(schema).toContain("groups = new MapSchema<LiveGroup>()");
    expect(schema).not.toContain("requests = new MapSchema");
  });

  it("prevents group mutations while a round is active", () => {
    const server = readFileSync("../game-server/src/rooms/GameSessionRoom.ts", "utf-8");
    expect(server).toContain("socialMutationsAllowed");
    expect(server).toContain('"ROUND_ACTIVE", "RESOLVING", "RESULTS"');
    expect(server).toContain('reason: "round-in-progress"');
  });

  it("keeps hidden roles out of the public round payload", () => {
    const server = readFileSync("../game-server/src/rooms/GameSessionRoom.ts", "utf-8");
    const silentVoteBlock = server.slice(
      server.indexOf('if (input.key === "silent-vote")'),
      server.indexOf('return {};'),
    );
    expect(silentVoteBlock).not.toContain("roles:");
    expect(server).toContain('this.sendToUser(userId, "role.assigned"');
    expect(server).toContain("privateRoundRoles");
  });

  it("limits the Pixi map to contextual players and aggregates the rest", () => {
    const map = readFileSync("src/components/social/SocialMapCanvas.tsx", "utf-8");
    expect(map).toContain("PLAYER_RENDER_LIMIT = 28");
    expect(map).toContain("selectVisibleMapPlayers");
    expect(map).toContain("updateClusters");
  });

});
