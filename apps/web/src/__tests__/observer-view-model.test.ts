import { describe, expect, it } from "vitest";
import {
  observerPublishedResultsFromRpc,
  observerSnapshotFromLive,
  observerSnapshotFromRpc,
} from "@/components/observer/observer-view-model";

describe("observer view models", () => {
  it("builds a readonly fallback snapshot from Connect data", () => {
    const snapshot = observerSnapshotFromRpc(
      {
        partyId: { value: "party-1" },
        currentPhase: "ROUND_ACTIVE",
        currentRoundNumber: 2,
        currentRoundStatus: "ACTIVE",
        connectedCount: 5,
        participantCount: 8,
      },
      "fallback-party",
    );

    expect(snapshot.partyId).toBe("party-1");
    expect(snapshot.participantCount).toBe(8);
    expect(snapshot.participants).toHaveLength(8);
    expect(snapshot.events[0]?.label).toContain("Manche 2");
  });

  it("maps the live readonly envelope to public observer fields only", () => {
    const snapshot = observerSnapshotFromLive(
      {
        partyId: "party-live",
        currentPhase: "active",
        currentRoundNumber: 3,
        currentRoundStatus: "ACTIVE",
        connectedCount: 4,
        playerCount: 6,
        participants: [
          { label: "Participant 1", status: "Actif", role: "observer" },
          { label: "Participant 2", status: "Déconnecté", provisional_score: 12 },
        ],
        timeline: [{ code: "ROUND_STATUS", label: "Manche 3 · ACTIVE" }],
        publishedResultsAvailable: false,
      },
      "fallback-party",
    );

    expect(snapshot.partyId).toBe("party-live");
    expect(snapshot.participants).toEqual([
      { label: "Participant 1", status: "Actif" },
      { label: "Participant 2", status: "Déconnecté" },
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(/provisional_score|role/);
  });

  it("builds published observer results without provisional semantics", () => {
    const results = observerPublishedResultsFromRpc({
      finalScores: [
        {
          playerId: { value: "player-1" },
          score: 1200,
          rank: 1,
          eliminated: false,
        },
      ],
      publishedAt: { seconds: BigInt("1789000000"), nanos: 0 },
    });

    expect(results.published).toBe(true);
    expect(results.rows).toEqual([
      {
        rank: 1,
        player: "Participant 1",
        status: "Classé",
        score: "1 200 pts",
      },
    ]);
    expect(JSON.stringify(results)).not.toMatch(/provisional/i);
  });
});
