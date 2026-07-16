import { describe, expect, it } from "vitest";
import { prisma, getPrisma } from "../prisma.js";

describe("L1 PrismaClient singleton", () => {
  it("provides a single PrismaClient instance", () => {
    const prisma2 = getPrisma();
    expect(prisma).toBe(prisma2);
  });

  it("has all expected model accessors", () => {
    expect(prisma.user).toBeDefined();
    expect(prisma.party).toBeDefined();
    expect(prisma.partyParticipation).toBeDefined();
    expect(prisma.round).toBeDefined();
    expect(prisma.provisionalScore).toBeDefined();
    expect(prisma.publishedScore).toBeDefined();
    expect(prisma.auditLog).toBeDefined();
    expect(prisma.announcement).toBeDefined();
    expect(prisma.notificationJob).toBeDefined();
    expect(prisma.wallet).toBeDefined();
    expect(prisma.paymentTransaction).toBeDefined();
    expect(prisma.ledgerEntry).toBeDefined();
    expect(prisma.authSession).toBeDefined();
    expect(prisma.roleAssignment).toBeDefined();
    expect(prisma.realtimeConnection).toBeDefined();
    expect(prisma.roundParticipant).toBeDefined();
    expect(prisma.playerAction).toBeDefined();
    expect(prisma.roundDeadline).toBeDefined();
    expect(prisma.scoreReview).toBeDefined();
    expect(prisma.deliveryLog).toBeDefined();
  });
});
