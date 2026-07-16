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
    requiredKeys: [
      "provisional_score_ready",
      "publish_results",
      "list_provisional_scores_admin",
      "score_waiting_review_player",
      "published_results_player",
      "no_leak",
    ],
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
    requiredKeys: [
      "create_live_access",
      "join_live",
      "reconnect_live",
      "live_state_view",
      "readonly_snapshot",
      "live_command_rejected",
    ],
  },
  {
    path: "../../fixtures/round/v1/round-lifecycle.json",
    description: "Round lifecycle orchestration",
    requiredKeys: [
      "configure_round",
      "start_round",
      "activate_round",
      "pause_round",
      "resume_round",
      "player_finished_round",
      "close_round",
      "round_closed",
      "late_input_rejected",
      "verification_state",
    ],
  },
  {
    path: "../../fixtures/identity/v1/password-reset.json",
    description: "Password reset auth contracts",
    requiredKeys: ["request_password_reset", "reset_password", "public_errors", "no_leak"],
  },
  {
    path: "../../fixtures/notification/v1/notification-lifecycle.json",
    description: "Notification job and delivery",
    requiredKeys: [
      "send_notification",
      "create_notification_job",
      "delivery_updated",
      "list_notifications",
      "acknowledge_notification",
      "constraints",
    ],
  },
  {
    path: "../../fixtures/minigame/v1/minigame-runtime.json",
    description: "Minigame runtime messages",
    requiredKeys: ["manifest", "command", "public_state", "private_state", "score_evidence", "no_leak"],
  },
  {
    path: "../../fixtures/compliance/v1/compliance-lifecycle.json",
    description: "Compliance gates incidents audit",
    requiredKeys: [
      "list_compliance_gates",
      "decide_compliance_gate",
      "open_incident",
      "list_audit_events",
      "record_anti_cheat_event",
      "list_risk_signals",
      "errors",
      "no_leak",
    ],
  },
  {
    path: "../../fixtures/payment/v1/payment-wallet.json",
    description: "Payment wallet views",
    requiredKeys: ["process_payment", "get_wallet", "wallet_view_player", "constraints"],
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
