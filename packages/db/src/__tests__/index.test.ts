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

  it("should expose roundInstance model", () => {
    expect(prisma.roundInstance).toBeDefined();
  });

  it("should expose gameResult model", () => {
    expect(prisma.gameResult).toBeDefined();
  });

  it("should expose auditLog model", () => {
    expect(prisma.auditLog).toBeDefined();
  });
});
