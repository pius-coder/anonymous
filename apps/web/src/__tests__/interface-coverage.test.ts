import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string) {
  return readFileSync(`${appRoot}/${relativePath}`, "utf8");
}

describe("documented interface coverage", () => {
  it("keeps the product entry public and the admin dashboard under /admin", () => {
    const landing = read("src/app/page.tsx");
    const shell = read("src/components/ui/AppShell.tsx");

    expect(landing).toContain("<PublicShell>");
    expect(landing).not.toContain('audience="Admin"');
    expect(shell).toContain('{ label: "Pilotage", href: "/admin"');
    expect(existsSync(`${appRoot}/src/app/admin/page.tsx`)).toBe(true);
  });

  it("ships the complete player acquisition and live journey", () => {
    const pages = [
      "src/app/(client)/account/page.tsx",
      "src/app/(client)/parties/page.tsx",
      "src/app/(client)/parties/[partyCode]/page.tsx",
      "src/app/(client)/parties/[partyCode]/participation/page.tsx",
      "src/app/(client)/parties/[partyCode]/payment/page.tsx",
      "src/app/(client)/parties/[partyCode]/lobby/page.tsx",
      "src/app/(client)/parties/[partyCode]/room/page.tsx",
      "src/app/(client)/parties/[partyCode]/round/page.tsx",
      "src/app/(client)/parties/[partyCode]/waiting/page.tsx",
      "src/app/(client)/parties/[partyCode]/results/page.tsx",
    ];

    for (const page of pages) expect(existsSync(`${appRoot}/${page}`), page).toBe(true);
    expect(read("src/app/(client)/parties/[partyCode]/page.tsx")).toContain("notFound()");
    expect(read("src/components/player/PlayerJourneyNav.tsx")).toContain("participation");
    expect(read("src/components/player/PlayerJourneyNav.tsx")).toContain("results");
  });

  it("separates admin decision, monitoring, scoring and audit surfaces", () => {
    for (const route of ["new", "[partyId]/setup", "[partyId]/control", "[partyId]/monitor", "[partyId]/scores", "[partyId]/audit", "[partyId]/incidents"]) {
      const page = `src/app/admin/parties/${route}/page.tsx`;
      expect(existsSync(`${appRoot}/${page}`), page).toBe(true);
    }

    expect(read("src/app/admin/layout.tsx")).toContain("RoleGate");
    expect(read("src/app/admin/parties/[partyId]/monitor/page.tsx").toLowerCase()).toContain("lecture seule");
    expect(read("src/app/admin/parties/[partyId]/scores/page.tsx")).toContain("AdminScoresPanel");
    expect(read("src/components/admin/AdminScoresPanel.tsx")).toContain("SensitiveActionPanel");
  });

  it("ships readonly observer, support and finance detail workflows", () => {
    const pages = [
      "src/app/observe/parties/[partyId]/page.tsx",
      "src/app/observe/parties/[partyId]/results/page.tsx",
      "src/app/support/page.tsx",
      "src/app/support/parties/[partyId]/page.tsx",
      "src/app/support/parties/[partyId]/players/[playerId]/page.tsx",
      "src/app/finance/page.tsx",
      "src/app/finance/transactions/[transactionId]/page.tsx",
    ];

    for (const page of pages) expect(existsSync(`${appRoot}/${page}`), page).toBe(true);
    for (const layout of ["observe", "support", "finance"]) {
      expect(read(`src/app/${layout}/layout.tsx`)).toContain("RoleGate");
    }
  });

  it("provides App Router loading, error and not-found states", () => {
    for (const file of ["loading.tsx", "error.tsx", "not-found.tsx"]) {
      expect(existsSync(`${appRoot}/src/app/${file}`), file).toBe(true);
    }
  });
});
