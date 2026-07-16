import { describe, expect, it } from "vitest";
import { getPersistenceFoundation, prisma } from "../index.js";

describe("L1 db foundation", () => {
  it("reports the persistence layer as rebuilt", () => {
    expect(getPersistenceFoundation()).toEqual({
      foundation: "v0.1",
      database: "postgresql",
      orm: "prisma",
      models: "rebuilt",
    });
  });

  it("exports a PrismaClient singleton", () => {
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeInstanceOf(Function);
  });
});

