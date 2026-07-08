import { describe, it, expect } from "vitest";
import prisma from "../index.js";

describe("Prisma Client", () => {
  it("should export prisma client", () => {
    expect(prisma).toBeDefined();
  });

  it("should have $connect method", () => {
    expect(typeof prisma.$connect).toBe("function");
  });

  it("should have $disconnect method", () => {
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("should expose user model", () => {
    expect(prisma.user).toBeDefined();
  });

  it("should expose playerProfile model", () => {
    expect(prisma.playerProfile).toBeDefined();
  });

  it("should expose playerStatsSnapshot model", () => {
    expect(prisma.playerStatsSnapshot).toBeDefined();
  });

  it("should expose authSession model", () => {
    expect(prisma.authSession).toBeDefined();
  });

  it("should expose passwordResetToken model", () => {
    expect(prisma.passwordResetToken).toBeDefined();
  });

  it("should expose roleAssignment model", () => {
    expect(prisma.roleAssignment).toBeDefined();
  });

  it("should expose gameSession model", () => {
    expect(prisma.gameSession).toBeDefined();
  });

  it("should expose sessionRegistration model", () => {
    expect(prisma.sessionRegistration).toBeDefined();
  });

  it("should expose wallet model", () => {
    expect(prisma.wallet).toBeDefined();
  });

  it("should expose ledgerEntry model", () => {
    expect(prisma.ledgerEntry).toBeDefined();
  });

  it("should expose paymentTransaction model", () => {
    expect(prisma.paymentTransaction).toBeDefined();
  });

  it("should expose webhookEvent model", () => {
    expect(prisma.webhookEvent).toBeDefined();
  });

  it("should expose joinToken model", () => {
    expect(prisma.joinToken).toBeDefined();
  });

  it("should expose liveSessionState model", () => {
    expect(prisma.liveSessionState).toBeDefined();
  });

  it("should expose liveReservation model", () => {
    expect(prisma.liveReservation).toBeDefined();
  });

  it("should expose playerConnection model", () => {
    expect(prisma.playerConnection).toBeDefined();
  });

  it("should expose roundInstance model", () => {
    expect(prisma.roundInstance).toBeDefined();
  });

  it("should expose roundDeadline model", () => {
    expect(prisma.roundDeadline).toBeDefined();
  });

  it("should expose playerAction model", () => {
    expect(prisma.playerAction).toBeDefined();
  });

  it("should expose roundOutcome model", () => {
    expect(prisma.roundOutcome).toBeDefined();
  });

  it("should expose resolutionLog model", () => {
    expect(prisma.resolutionLog).toBeDefined();
  });

  it("should expose gameEvent model", () => {
    expect(prisma.gameEvent).toBeDefined();
  });

  it("should expose miniGameDefinition model", () => {
    expect(prisma.miniGameDefinition).toBeDefined();
  });

  it("should expose gameResult model", () => {
    expect(prisma.gameResult).toBeDefined();
  });

  it("should expose prizeDistribution model", () => {
    expect(prisma.prizeDistribution).toBeDefined();
  });

  it("should expose commissionRecord model", () => {
    expect(prisma.commissionRecord).toBeDefined();
  });

  it("should expose disputeWindow model", () => {
    expect(prisma.disputeWindow).toBeDefined();
  });

  it("should expose supportCase model", () => {
    expect(prisma.supportCase).toBeDefined();
  });

  it("should expose incidentLog model", () => {
    expect(prisma.incidentLog).toBeDefined();
  });

  it("should expose adminActionApproval model", () => {
    expect(prisma.adminActionApproval).toBeDefined();
  });

  it("should expose auditLog model", () => {
    expect(prisma.auditLog).toBeDefined();
  });
});
