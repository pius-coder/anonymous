import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

interface FixtureEntry {
  path: string;
  description: string;
  requiredKeys: string[];
}

const FIXTURES: FixtureEntry[] = [
  {
    path: "../../fixtures/common/v1/shared.json",
    description: "shared common types",
    requiredKeys: ["uuid", "timestamp", "money", "player_id", "party_id", "round_id"],
  },
  {
    path: "../../fixtures/session/v1/create-party.json",
    description: "CreateParty command",
    requiredKeys: ["correlation_id", "config", "created_by"],
  },
  {
    path: "../../fixtures/scoring/v1/provisional-score.json",
    description: "ProvisionalScore and PublishResults",
    requiredKeys: ["provisional_score_ready", "publish_results"],
  },
  {
    path: "../../fixtures/preparation/v1/preparation-lifecycle.json",
    description: "Preparation lifecycle",
    requiredKeys: ["open_preparation", "mark_ready", "confirm_start"],
  },
  {
    path: "../../fixtures/admin/v1/admin-snapshots.json",
    description: "Admin game state snapshots",
    requiredKeys: ["get_admin_game_state", "admin_game_state", "readonly_snapshot"],
  },
  {
    path: "../../fixtures/realtime/v1/live-access.json",
    description: "Realtime live access and state views",
    requiredKeys: ["create_live_access", "join_live", "reconnect_live", "live_state_view", "readonly_snapshot", "live_command_rejected"],
  },
  {
    path: "../../fixtures/round/v1/round-lifecycle.json",
    description: "Round lifecycle orchestration",
    requiredKeys: ["configure_round", "start_round", "activate_round", "pause_round", "resume_round", "player_finished_round", "close_round", "round_closed", "late_input_rejected", "verification_state"],
  },
];

describe("Golden fixtures", () => {
  for (const fixture of FIXTURES) {
    it(`should load ${fixture.description}`, () => {
      const filePath = resolve(__dirname, fixture.path);
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      for (const key of fixture.requiredKeys) {
        expect(data).toHaveProperty(key);
        expect(data[key]).toBeDefined();
        expect(data[key]).not.toBeNull();
      }
    });
  }
});
