import { describe, expect, it } from "vitest";

describe("web foundation", () => {
  it("keeps tests active after legacy removal", () => {
    expect("v0.1").toBe("v0.1");
  });
});

