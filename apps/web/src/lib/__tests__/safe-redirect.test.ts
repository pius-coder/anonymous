import { describe, expect, it } from "vitest";
import { safeInternalRedirect } from "../safe-redirect";

describe("safeInternalRedirect", () => {
  it("keeps internal application paths", () => {
    expect(safeInternalRedirect("/session/ABC-123?tab=lobby#ready")).toBe(
      "/session/ABC-123?tab=lobby#ready",
    );
  });

  it.each(["javascript:alert(1)", "https://evil.example", "//evil.example", "/\\evil", "/%5cevil"])(
    "rejects unsafe redirect %s",
    (value) => {
      expect(safeInternalRedirect(value)).toBe("/me/sessions");
    },
  );
});
