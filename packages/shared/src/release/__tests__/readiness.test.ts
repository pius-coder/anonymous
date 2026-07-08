import { describe, expect, it } from "vitest";
import {
  DOCUMENTATION_GATES,
  PRE_LAUNCH_GATES,
  RECETTE_JOURNEYS,
  evaluateReleaseReadiness,
} from "../readiness.js";

describe("release readiness", () => {
  it("archives documentary gates for all installed production technologies", () => {
    const technologies = DOCUMENTATION_GATES.map((gate) => gate.technology);

    expect(technologies).toEqual(
      expect.arrayContaining([
        "Hono",
        "Next.js",
        "Prisma",
        "Colyseus",
        "BullMQ",
        "Redis",
        "Docker Compose",
        "Fapshi",
        "WhatsApp Cloud API",
      ]),
    );
    expect(DOCUMENTATION_GATES.every((gate) => gate.status === "pass")).toBe(true);
  });

  it("tracks all five final recette journeys from the launch plan", () => {
    expect(RECETTE_JOURNEYS.map((journey) => journey.id)).toEqual([
      "discovery-registration",
      "payment-lobby",
      "live-resolution",
      "results-credits",
      "support-audit",
    ]);

    for (const journey of RECETTE_JOURNEYS) {
      expect(journey.requiredEvidence.length).toBeGreaterThanOrEqual(5);
      expect(journey.automatedEvidence.length).toBeGreaterThan(0);
    }
  });

  it("allows controlled sandbox recette but blocks live launch until external gates are approved", () => {
    const decision = evaluateReleaseReadiness();

    expect(decision.controlledSandbox).toBe("go");
    expect(decision.liveProduction).toBe("no-go");
    expect(decision.blockers).toEqual(
      expect.arrayContaining(["fapshi-live", "privacy-terms", "postgres-backups"]),
    );
  });

  it("keeps every live blocker explicit and actionable", () => {
    const liveBlockers = PRE_LAUNCH_GATES.filter((gate) => gate.blocksLiveLaunch);

    expect(liveBlockers.length).toBeGreaterThan(0);
    for (const gate of liveBlockers) {
      expect(gate.note.length).toBeGreaterThan(20);
      expect(["manual", "blocked"]).toContain(gate.status);
    }
  });
});
