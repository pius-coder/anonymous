/**
 * L4: AdminService ConnectRPC handlers (local transport).
 * Production central router remains SEQ ownership — not edited by P-A-ADMIN.
 */
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";
import { AdminV1 } from "@session-jeu/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readMocks = vi.hoisted(() => ({
  getAdminGameStateView: vi.fn(),
  getReadonlySnapshotView: vi.fn(),
  listAdminPartiesView: vi.fn(),
  getSystemReadinessView: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  requireRpcUser: vi.fn(),
  requireRpcRole: vi.fn(),
  connectCodeFromHttpStatus: (status: number) => {
    if (status === 403) return Code.PermissionDenied;
    if (status === 404) return Code.NotFound;
    if (status === 409) return Code.FailedPrecondition;
    return Code.Internal;
  },
}));

vi.mock("../../use-cases/admin/admin-read.use-case.js", () => readMocks);
vi.mock("../auth-context.js", () => authMocks);

import { adminService } from "../admin-service.js";

function client() {
  const transport = createRouterTransport(({ service }) => {
    service(AdminV1.AdminService, adminService);
  });
  return createClient(AdminV1.AdminService, transport);
}

describe("AdminService L4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireRpcUser.mockResolvedValue({ id: "admin-1", roles: ["ADMIN"] });
    authMocks.requireRpcRole.mockImplementation(async (_ctx: unknown, ...roles: string[]) => {
      const user = { id: "admin-1", roles: ["ADMIN"] };
      if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN") && !roles.includes("SUPPORT")) {
        throw new ConnectError("Permission insuffisante", Code.PermissionDenied);
      }
      return user;
    });
  });

  it("listParties returns admin projection for staff", async () => {
    readMocks.listAdminPartiesView.mockResolvedValue({
      total: 1,
      parties: [
        {
          id: "p1",
          code: "C1",
          name: "Arena",
          status: "SCHEDULED",
          visibility: "public",
          scheduledAt: null,
          minPlayers: 2,
          maxPlayers: 16,
          roundProgram: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participantCount: 3,
          description: null,
          entryFeeAmount: 500,
          entryFeeCurrency: "XAF",
          configVersion: 1,
          feeVersion: 1,
        },
      ],
    });

    const res = await client().listParties({ pageSize: 10, pageToken: "" });
    expect(res.parties).toHaveLength(1);
    expect(res.parties[0]?.config?.name).toBe("Arena");
  });

  it("rejects player role on listParties", async () => {
    authMocks.requireRpcRole.mockRejectedValue(
      new ConnectError("Permission insuffisante", Code.PermissionDenied),
    );
    await expect(client().listParties({ pageSize: 10, pageToken: "" })).rejects.toMatchObject({
      code: Code.PermissionDenied,
    });
  });

  it("getGameState maps participants", async () => {
    readMocks.getAdminGameStateView.mockResolvedValue({
      party: {
        id: "p1",
        code: "C1",
        name: "Arena",
        status: "PREPARATION_OPEN",
        visibility: "public",
        scheduledAt: null,
        minPlayers: 2,
        maxPlayers: 16,
        roundProgram: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participantCount: 1,
        description: "d",
        entryFeeAmount: null,
        entryFeeCurrency: "XAF",
        configVersion: 1,
        feeVersion: 1,
      },
      participants: [
        {
          playerId: "u1",
          name: "Ada",
          connectionStatus: "connected",
          participationStatus: "PRESENT",
          isReady: true,
        },
      ],
      participantCount: 1,
      connectedCount: 1,
      currentRoundId: null,
      currentPhase: "PREPARATION_OPEN",
      lease: { partyId: "p1", holderUserId: null, expiresAt: null, heldByCaller: false },
    });

    const res = await client().getGameState({ partyId: { value: "p1" } });
    expect(res.state?.participants).toHaveLength(1);
    expect(res.state?.participants[0]?.name).toBe("Ada");
  });

  it("getSystemReadiness returns public components only", async () => {
    readMocks.getSystemReadinessView.mockResolvedValue({
      ready: true,
      contractsVersion: "v-test",
      components: [{ name: "api", status: "UP", publicDetail: "ok" }],
      checkedAt: new Date().toISOString(),
    });
    const res = await client().getSystemReadiness({ deep: false });
    expect(res.ready).toBe(true);
    expect(res.contractsVersion).toBe("v-test");
    expect(res.components[0]?.publicDetail).toBe("ok");
  });
});
