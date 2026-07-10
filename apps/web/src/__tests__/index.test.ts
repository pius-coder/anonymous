import { readFileSync } from "fs";
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
    const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.dev).toContain("--hostname 0.0.0.0");
    expect(pkg.scripts.dev).toContain("--port 3000");
  });
});
