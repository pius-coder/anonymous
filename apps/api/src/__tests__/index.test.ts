import { describe, expect, it } from "vitest";
import app from "../index.js";

describe("api foundation", () => {
  it("exposes a neutral health endpoint", async () => {
    const response = await app.request("/health");
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "api",
      foundation: "v0.1",
    });
  });
});

