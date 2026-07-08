import { describe, expect, it } from "vitest";
import {
  calculateSessionFinancials,
  createAdminSessionSchema,
  generateSessionCode,
  updateAdminSessionSchema,
} from "../sessionConfig.js";

describe("admin session config rules", () => {
  it("calculates XAF integer financial simulation with bps", () => {
    const simulation = calculateSessionFinancials({
      paidRegistrationsCount: 20,
      minPlayers: 10,
      maxPlayers: 20,
      entryFeeXaf: 1000,
      providerFeeBps: 300,
      prizePoolBps: 6000,
      winnerSplitBps: [10000],
    });

    expect(simulation.grossCollectionXaf).toBe(20_000);
    expect(simulation.estimatedFeesXaf).toBe(600);
    expect(simulation.netCollectionXaf).toBe(19_400);
    expect(simulation.prizePoolXaf).toBe(11_640);
    expect(simulation.organizationCommissionXaf).toBe(7_760);
    expect(simulation.maximumProjectedRevenueXaf).toBe(7_760);
  });

  it("rejects invalid capacity and winner split", () => {
    const result = createAdminSessionSchema.safeParse({
      name: "Night Drop",
      minPlayers: 10,
      maxPlayers: 5,
      entryFeeXaf: 1000,
      winnerSplitBps: [5000, 4000],
      startsAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejects past startsAt and registration close after start", () => {
    const result = createAdminSessionSchema.safeParse({
      name: "Night Drop",
      minPlayers: 2,
      maxPlayers: 5,
      entryFeeXaf: 1000,
      winnerSplitBps: [10000],
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      registrationClosesAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("requires reason and expectedConfigVersion for updates", () => {
    const result = updateAdminSessionSchema.safeParse({
      name: "Updated",
      expectedConfigVersion: 1,
    });

    expect(result.success).toBe(false);
  });

  it("generates uppercase URL-safe session codes", () => {
    expect(generateSessionCode("Défi stratégie nuit", "ABC123")).toBe("DEFI-STRATEGIE-NUIT-ABC123");
  });
});
