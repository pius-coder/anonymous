import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../index.js";
import { hashOpaqueToken } from "../../auth/session.js";

const dbMocks = vi.hoisted(() => ({
  authRepository: {
    findAuthSessionByToken: vi.fn(),
    revokeAuthSession: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
  partyRepository: {
    listParties: vi.fn(),
    findPartyById: vi.fn(),
  },
  participationRepository: {
    countByPartyId: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const sessionToken = "session-token-admin-rbac";

function authed(roles: string[]) {
  dbMocks.authRepository.findAuthSessionByToken.mockResolvedValueOnce({
    id: "session-1",
    token: hashOpaqueToken(sessionToken),
    expiresAt: new Date(Date.now() + 60_000),
    sessionVersion: 1,
    user: {
      id: roles.includes("ADMIN") ? "admin-1" : "player-1",
      email: "user@example.com",
      name: "User",
      avatarUrl: null,
      sessionVersion: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      roleAssignments: roles.map((role) => ({ role })),
    },
  });

  return app.request("/v1/admin/parties", {
    method: "GET",
    headers: {
      cookie: `__session=${sessionToken}`,
    },
  });
}

describe("admin party routes RBAC (L5 gate)", () => {
  beforeEach(() => {
    process.env.ALLOW_INSECURE_AUTH_COOKIE = "true";
    vi.clearAllMocks();
    dbMocks.partyRepository.listParties.mockResolvedValue([]);
    dbMocks.participationRepository.countByPartyId.mockResolvedValue(0);
    dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
  });

  it("rejects unauthenticated list", async () => {
    const res = await app.request("/v1/admin/parties");
    expect(res.status).toBe(401);
  });

  it("rejects player role on list", async () => {
    const res = await authed(["PLAYER"]);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toBeDefined();
    expect(body.error?.message).toBeTruthy();
  });

  it("allows admin role to list parties", async () => {
    const res = await authed(["ADMIN"]);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { parties: unknown[]; total: number } };
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(0);
  });
});
