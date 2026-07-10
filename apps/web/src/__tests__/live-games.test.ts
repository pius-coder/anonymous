import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("live mini-game surfaces", () => {
  it("wires all six recette game families in the live route", () => {
    const content = readFileSync("src/app/(client)/session/[code]/live/page.tsx", "utf-8");
    for (const key of [
      "memory-sequence",
      "pure-reaction-duel",
      "trust-bridge",
      "team-relay",
      "danger-sweep",
      "silent-vote",
    ]) {
      expect(content).toContain(key);
    }
  });

  it("keeps every game surface read-only capable for spectators", () => {
    for (const file of [
      "src/components/games/MemorySequenceGame.tsx",
      "src/components/games/ReactionDuelGame.tsx",
      "src/components/games/TrustBridgeGame.tsx",
      "src/components/games/TeamRelayGame.tsx",
      "src/components/games/DangerSweepGame.tsx",
      "src/components/games/SilentVoteGame.tsx",
    ]) {
      expect(readFileSync(file, "utf-8")).toContain("readOnly");
    }
  });

  it("uses the fullscreen 2D live room shell for lobby and live", () => {
    expect(readFileSync("src/components/live/LiveRoomShell.tsx", "utf-8")).toContain("fixed inset-0");
    expect(readFileSync("src/app/(client)/session/[code]/live/page.tsx", "utf-8")).toContain("LiveRoomShell");
    expect(readFileSync("src/components/lobby/LobbyPage.tsx", "utf-8")).toContain("LiveRoomShell");
  });
});
