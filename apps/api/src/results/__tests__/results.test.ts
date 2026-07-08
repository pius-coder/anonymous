import { describe, expect, it } from "vitest";
import { calculatePrizeDistribution } from "../results.js";

describe("results distribution formulas", () => {
  it("calculates XAF/bps financials and assigns remainder to first winner by default", () => {
    const result = calculatePrizeDistribution({
      paidRegistrationsCount: 20,
      entryFeeXaf: 1000,
      providerFeeBps: 300,
      prizePoolBps: 6000,
      winnerSplitBps: [5000, 3000, 2000],
    });

    expect(result).toMatchObject({
      grossCollectionXaf: 20000,
      providerFeesXaf: 600,
      netCollectionXaf: 19400,
      prizePoolXaf: 11640,
      organizationCommissionXaf: 7760,
      roundingRemainderXaf: 0,
      winnerSharesXaf: [5820, 3492, 2328],
    });
  });

  it("can route integer rounding remainder to platform commission", () => {
    const result = calculatePrizeDistribution({
      paidRegistrationsCount: 3,
      entryFeeXaf: 1000,
      providerFeeBps: 0,
      prizePoolBps: 10000,
      winnerSplitBps: [3333, 3333, 3334],
      remainderPolicy: "PLATFORM_COMMISSION",
    });

    expect(result.prizePoolXaf).toBe(3000);
    expect(result.winnerSharesXaf).toEqual([999, 999, 1000]);
    expect(result.roundingRemainderXaf).toBe(2);
    expect(result.organizationCommissionXaf).toBe(2);
  });
});
