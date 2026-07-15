import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string) {
  return readFileSync(`${appRoot}/${relativePath}`, "utf8");
}

describe("complete UI foundation", () => {
  it("locks the viewport and reserves scrolling for internal content", () => {
    const css = read("src/app/globals.css");

    expect(css).toMatch(/html,\s*body[\s\S]*overflow:\s*hidden/);
    expect(css).toMatch(/\.app-shell-frame[\s\S]*height:\s*100dvh/);
    expect(css).toMatch(/\.app-content[\s\S]*overflow-y:\s*auto/);
    expect(css).toContain("#69f58d");
  });

  it("keeps role navigation and actions inside the shared shell", () => {
    const shell = read("src/components/ui/AppShell.tsx");

    for (const audience of [
      "Joueur",
      "Admin",
      "Super admin",
      "Support",
      "Finance",
      "Observateur",
    ]) {
      expect(shell).toContain(audience);
    }

    expect(shell).toContain("<Sidebar");
    expect(shell).toContain("<header className=\"app-header\"");
    expect(shell).toContain("<Search />");
    expect(shell).toContain("<Bell />");
    expect(shell).toContain("<PixelAvatar");
  });

  it("exposes one ConnectRPC facade for every frontend domain", () => {
    const rpc = read("src/services/rpcServices.ts");

    for (const service of [
      "SessionService",
      "ParticipationService",
      "PreparationService",
      "PaymentService",
      "LiveAccessService",
      "MiniGameService",
      "ScoringService",
      "AdminService",
      "NotificationService",
    ]) {
      expect(rpc).toContain(`export const ${service}`);
    }

    expect(rpc).toContain("rpcClients");
    expect(read("src/lib/rpc.ts")).toContain("createConnectTransport");
  });

  it("uses a responsive Pixi lifecycle with managed CC0 room assets", () => {
    const room = read("src/components/game/ArenaRoomCanvas.tsx");
    const assetDirectory = `${appRoot}/public/game-assets/kenney-tiny-dungeon/Tiles`;
    const tiles = readdirSync(assetDirectory).filter((file) => /^tile_\d{4}\.png$/.test(file));

    expect(room).toContain("new Application()");
    expect(room).toContain("resizeTo: hostElement");
    expect(room).toContain("Assets.addBundle");
    expect(room).toContain("Assets.loadBundle");
    expect(room).toContain("app.destroy");
    expect(tiles).toHaveLength(132);
    expect(existsSync(`${appRoot}/public/game-assets/kenney-tiny-dungeon/License.txt`)).toBe(true);
    expect(existsSync(`${appRoot}/public/game-assets/manifest.json`)).toBe(true);
  });

  it("ships the role and player routes defined by the UI inventory", () => {
    const requiredPages = [
      "src/app/page.tsx",
      "src/app/(client)/parties/page.tsx",
      "src/app/(client)/parties/[partyCode]/room/page.tsx",
      "src/app/(client)/parties/[partyCode]/round/page.tsx",
      "src/app/(client)/parties/[partyCode]/results/page.tsx",
      "src/app/admin/parties/page.tsx",
      "src/app/admin/users/page.tsx",
      "src/app/admin/payments/page.tsx",
      "src/app/admin/audit/page.tsx",
      "src/app/admin/compliance/page.tsx",
      "src/app/super-admin/page.tsx",
      "src/app/support/page.tsx",
      "src/app/finance/page.tsx",
      "src/app/observe/parties/[partyId]/page.tsx",
    ];

    for (const page of requiredPages) {
      expect(existsSync(`${appRoot}/${page}`), page).toBe(true);
    }
  });
});
