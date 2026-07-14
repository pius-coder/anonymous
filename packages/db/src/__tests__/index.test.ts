import { describe, expect, it } from "vitest";
import { getPersistenceFoundation } from "../index.js";

describe("db foundation", () => {
  it("keeps the persistence toolchain without legacy models", () => {
    expect(getPersistenceFoundation()).toEqual({
      foundation: "v0.1",
      database: "postgresql",
      orm: "prisma",
      models: "to-be-rebuilt",
    });
  });
});

