import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.smoke.test.ts"],
    // Shared disposable infra — run files sequentially to avoid port races inside a single worktree.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: process.env.CI ? { junit: "test-results/integration-junit.xml" } : undefined,
  },
});
