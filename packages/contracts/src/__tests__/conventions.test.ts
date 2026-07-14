import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

interface ProtoFileEntry {
  path: string;
  package: string;
}

function discoverProtoFiles(): ProtoFileEntry[] {
  const base = resolve(__dirname, "../../proto");
  const results: ProtoFileEntry[] = [];

  const walk = (dir: string, pkg: string) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, entry.name);
      } else if (entry.name.endsWith(".proto")) {
        results.push({ path: full, package: pkg });
      }
    }
  };

  walk(base, "");
  return results;
}

describe("Proto conventions", () => {
  const files = discoverProtoFiles();

  it("should discover at least 10 proto files", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  for (const file of files) {
    it(`should have UNSPECIFIED = 0 as first value in all enums: ${file.path}`, () => {
      const content = readFileSync(file.path, "utf-8");
      const lines = content.split("\n");
      let inEnum = false;
      let expectUnspecified = false;

      for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("enum ")) {
          inEnum = true;
          expectUnspecified = true;
          continue;
        }
        if (inEnum && line === "{") {
          continue;
        }
        if (inEnum && line.startsWith("option ")) {
          continue;
        }
        if (inEnum && line.startsWith("}")) {
          inEnum = false;
          expectUnspecified = false;
          continue;
        }
        if (inEnum && expectUnspecified && line.match(/^[A-Z_]+(\s|=)/)) {
          expect(line).toMatch(/UNSPECIFIED\s*=\s*0/);
          expectUnspecified = false;
        }
      }
    });

    it(`should use proto3 syntax: ${file.path}`, () => {
      const content = readFileSync(file.path, "utf-8");
      expect(content).toContain('syntax = "proto3"');
    });

    it(`should have a package declaration: ${file.path}`, () => {
      const content = readFileSync(file.path, "utf-8");
      expect(content).toMatch(/^package\s+\S+;\s*$/m);
    });
  }
});
