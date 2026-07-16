import { describe, expect, it, vi } from "vitest";
import { log } from "../logging.js";

describe("worker logging redaction", () => {
  it("does not emit raw secrets in log lines", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.info("delivery", {
      correlationId: "c-1",
      token: "super-secret-token",
      api_key: "k-123",
      phone: "+237600000099",
    });
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).not.toContain("super-secret-token");
    expect(line).not.toContain("k-123");
    expect(line).not.toContain("600000099");
    expect(line).toContain("c-1");
    expect(line).toContain("***");
    spy.mockRestore();
  });
});
