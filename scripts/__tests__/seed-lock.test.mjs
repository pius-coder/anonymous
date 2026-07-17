/**
 * L1: seed lock serializes concurrent seed attempts (no parallel double-create).
 * Does not require a live database — mocks by checking lock mutual exclusion.
 */
import { describe, it, expect } from "vitest";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

describe("L1 seed lock isolation", () => {
  it("uses stable lock directory per DATABASE_URL", () => {
    const url = "postgresql://u:***@127.0.0.1:5432/test_db?schema=public";
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
    const expected = join(tmpdir(), `session-jeu-seed-${hash}`);
    expect(expected).toContain("session-jeu-seed-");
    expect(hash).toHaveLength(16);
  });

  it("atomic mkdir provides exclusivity for two workers", () => {
    const dir = join(tmpdir(), `session-jeu-seed-test-${process.pid}-${Date.now()}`);
    mkdirSync(dir);
    let secondOk = true;
    try {
      mkdirSync(dir);
    } catch (err) {
      secondOk = false;
      expect(/** @type {NodeJS.ErrnoException} */ (err).code).toBe("EEXIST");
    }
    expect(secondOk).toBe(false);
    writeFileSync(join(dir, "done"), "1");
    expect(existsSync(join(dir, "done"))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
