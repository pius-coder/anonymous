import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const filesToCheck = [
  "src/app/(client)/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/(client)/catalogue/page.tsx",
  "src/app/(client)/notifications/page.tsx",
  "src/app/(client)/session/[code]/page.tsx",
  "src/components/SessionCard.tsx",
  "src/components/CTAButton.tsx",
];

describe("Forbidden Wording", () => {
  const forbiddenPatterns = [
    /\bpari\b/i,
    /\bmise\b/i,
    /\bjackpot\b/i,
    /\bgain garanti\b/i,
  ];

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
    const content = readFileSync("src/app/(client)/catalogue/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("admin page has default export", () => {
    const content = readFileSync("src/app/admin/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("notifications page has default export", () => {
    const content = readFileSync("src/app/(client)/notifications/page.tsx", "utf-8");
    expect(content).toContain("export default");
  });

  it("session detail page has generateMetadata", () => {
    const content = readFileSync("src/app/(client)/session/[code]/page.tsx", "utf-8");
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
