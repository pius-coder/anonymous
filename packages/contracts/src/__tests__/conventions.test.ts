import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { relative, resolve } from "path";
import { getContractsFoundation } from "../index.js";

type DependencyMap = Record<string, string>;

interface PackageManifest {
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
}

interface ProtoFileEntry {
  path: string;
  relativePath: string;
  packageRoot: string;
}

const PROJECT_ROOT = resolve(__dirname, "../../../..");
const PROTO_BASE = resolve(__dirname, "../../proto");
const WORKSPACE_MANIFEST_ROOTS = ["apps", "packages"];
const EXPECTED_PACKAGE_ROOTS = getContractsFoundation().packages;

function relativeToProject(path: string): string {
  return relative(PROJECT_ROOT, path).replaceAll("\\", "/");
}

function discoverPackageManifests(): string[] {
  const manifests = [resolve(PROJECT_ROOT, "package.json")];

  for (const rootName of WORKSPACE_MANIFEST_ROOTS) {
    const rootPath = resolve(PROJECT_ROOT, rootName);
    if (!existsSync(rootPath)) continue;

    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const manifestPath = resolve(rootPath, entry.name, "package.json");
      if (existsSync(manifestPath)) {
        manifests.push(manifestPath);
      }
    }
  }

  return manifests.sort();
}

const PACKAGE_MANIFESTS = discoverPackageManifests();

function readPackageManifest(path: string): PackageManifest {
  return JSON.parse(readFileSync(path, "utf-8")) as PackageManifest;
}

function dependencyNames(manifest: PackageManifest): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ];
}

function discoverProtoFiles(): ProtoFileEntry[] {
  const results: ProtoFileEntry[] = [];

  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".proto")) {
        const relativePath = relative(PROTO_BASE, full).replaceAll("\\", "/");
        const packageRoot = relativePath.split("/").slice(0, 2).join("/");
        results.push({ path: full, relativePath, packageRoot });
      }
    }
  };

  walk(PROTO_BASE);
  return results;
}

function extractEnumBlocks(content: string): Array<{ name: string; firstValue: string }> {
  const enumBlocks: Array<{ name: string; firstValue: string }> = [];
  const enumPattern = /enum\s+([A-Za-z][A-Za-z0-9_]*)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;

  while ((match = enumPattern.exec(content)) !== null) {
    const [, name, body] = match;
    const statements = body
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .map((statement) =>
        statement
          .split("\n")
          .map((line) => line.replace(/\/\/.*$/, "").trim())
          .filter(Boolean)
          .join(" ")
          .trim(),
      )
      .filter(Boolean);
    const firstValue = statements.find(
      (statement) => !statement.startsWith("option ") && !statement.startsWith("reserved "),
    );

    enumBlocks.push({ name, firstValue: firstValue ?? "" });
  }

  return enumBlocks;
}

describe("Proto conventions", () => {
  const files = discoverProtoFiles();

  it("should discover at least 10 proto files", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it("should keep proto roots aligned with the exported contracts foundation", () => {
    const discoveredRoots = [...new Set(files.map((file) => file.packageRoot))].sort();

    expect(discoveredRoots).toEqual([...EXPECTED_PACKAGE_ROOTS].sort());
  });

  for (const file of files) {
    it(`should have UNSPECIFIED = 0 as first value in all enums: ${file.relativePath}`, () => {
      const content = readFileSync(file.path, "utf-8");
      const enumBlocks = extractEnumBlocks(content);

      for (const enumBlock of enumBlocks) {
        expect(
          enumBlock.firstValue,
          `${file.relativePath}:${enumBlock.name} must start with a *_UNSPECIFIED = 0 enum value`,
        ).toMatch(/^[A-Z][A-Z0-9_]*_UNSPECIFIED\s*=\s*0(?:\s+\[.+\])?$/);
      }
    });

    it(`should use proto3 syntax: ${file.relativePath}`, () => {
      const content = readFileSync(file.path, "utf-8");
      expect(content).toMatch(/^syntax\s*=\s*"proto3";\s*$/m);
    });

    it(`should have a package declaration: ${file.relativePath}`, () => {
      const content = readFileSync(file.path, "utf-8");
      expect(content).toMatch(/^package\s+\S+;\s*$/m);
    });
  }

  it("only installs ConnectRPC runtime packages once generation is wired", () => {
    const generationConfig = resolve(PROJECT_ROOT, "packages/contracts/buf.gen.yaml");
    const generatedIdentityService = resolve(
      PROJECT_ROOT,
      "packages/contracts/src/gen/identity/v1/identity_pb.ts",
    );

    for (const manifestPath of PACKAGE_MANIFESTS) {
      const dependencyNamesInManifest = dependencyNames(readPackageManifest(manifestPath));
      const connectRpcDependencies = dependencyNamesInManifest.filter((name) =>
        name.startsWith("@connectrpc/"),
      );

      if (connectRpcDependencies.length > 0) {
        expect(existsSync(generationConfig), "buf.gen.yaml must exist before ConnectRPC is installed").toBe(true);
        expect(
          existsSync(generatedIdentityService),
          "generated service descriptors must exist before ConnectRPC is installed",
        ).toBe(true);
      }
    }
  });

  it("should not reference the deprecated Connect ES v1 generator in installable manifests", () => {
    const scannedFiles = [
      ...PACKAGE_MANIFESTS,
      resolve(PROJECT_ROOT, "pnpm-lock.yaml"),
    ];

    for (const scannedFile of scannedFiles) {
      const content = readFileSync(scannedFile, "utf-8");
      const hasDeprecatedGenerator = content.includes("protoc-gen-connect-es");

      expect(
        hasDeprecatedGenerator,
        `${relativeToProject(scannedFile)} should not reference protoc-gen-connect-es`,
      ).toBe(false);
    }
  });
});
