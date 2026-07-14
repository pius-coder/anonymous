import { describe, expect, it } from "vitest";
import { getWorkerFoundation } from "../index.js";

describe("worker foundation", () => {
  it("keeps only the jobs foundation marker", () => {
    expect(getWorkerFoundation()).toEqual({
      service: "worker",
      foundation: "v0.1",
      jobs: "payment-reconciliation",
    });
  });
});

