import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const filesToCheck = [
  "src/app/(client)/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/(arena)/catalogue/page.tsx",
  "src/app/(arena)/notifications/page.tsx",
  "src/app/(arena)/session/[code]/page.tsx",
  "src/components/SessionCard.tsx",
  "src/components/CTAButton.tsx",
];

describe("Forbidden Wording", () => {
  const forbiddenPatterns = [/\bpari\b/i, /\bmise\b/i, /\bjackpot\b/i, /\bgain garanti\b/i];

  for (const file of filesToCheck) {
    it(`should not contain forbidden wording in ${file}`, () => {
      const content = readFileSync(file, "utf-8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    });
  }
});

describe("Page Exports", () => {
  it("landing page has default export", () => {
    const content = readFileSync("src/app/(client)/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("catalogue page has default export", () => {
    const content = readFileSync("src/app/(arena)/catalogue/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("admin page has default export", () => {
    const content = readFileSync("src/app/admin/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("notifications page has default export", () => {
    const content = readFileSync("src/app/(arena)/notifications/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("session detail page has generateMetadata", () => {
    const content = readFileSync("src/app/(arena)/session/[code]/page.tsx", "utf-8");
    expect(content).toContain("generateMetadata");
  });

  it("SessionCard has default export", () => {
    const content = readFileSync("src/components/SessionCard.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("CTAButton has export", () => {
    const content = readFileSync("src/components/CTAButton.tsx", "utf-8");
    expect(content).toMatch(/export (default |function )/);
  });
});

describe("Authenticated page loading states", () => {
  it("stops profile loading after an anonymous session resolves", () => {
    const content = readFileSync("src/app/(arena)/me/page.tsx", "utf-8");

    expect(content).toContain("if (loading || !userId) return");
    expect(content).toContain("user && loadedUserId !== user.id");
    expect(content).toContain("new AbortController()");
    expect(content).toContain("controller.abort()");
    expect(content).not.toContain("setLoadingData");
  });

  it("stops history loading and renders every API bucket", () => {
    const content = readFileSync("src/app/(arena)/me/sessions/page.tsx", "utf-8");

    expect(content).toContain("if (loading || !userId) return");
    expect(content).toContain("user && loadedUserId !== user.id");
    expect(content).toContain("new AbortController()");
    expect(content).toContain("controller.abort()");
    expect(content).toContain('"cancelled"');
    expect(content).toContain('"no-show"');
  });

  it("uses server snapshots for the shared session store", () => {
    const content = readFileSync("src/lib/useSession.ts", "utf-8");

    expect(content).toContain("useSyncExternalStore");
    expect(content).toContain("getServerUserSnapshot");
    expect(content).toContain("getServerFetchedSnapshot");
    expect(content).not.toContain("useState<SessionUser | null>(cache)");
  });
});
