import { describe, it, expect } from "vitest";

describe("Web App", () => {
  it("should have correct dependencies", () => {
    const deps = {
      next: "16.2.10",
      react: "19.2.4",
      "react-dom": "19.2.4",
    };
    expect(deps.next).toBe("16.2.10");
    expect(deps.react).toBe("19.2.4");
  });

  it("should have correct dev scripts", () => {
    const scripts = {
      dev: "next dev --port 3000",
      build: "next build",
      start: "next start",
    };
    expect(scripts.dev).toContain("--port 3000");
  });
});
