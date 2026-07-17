/**
 * L4: Preparation routes + RBAC (Hono transport).
 * Auth is mocked; use-cases are mocked for isolation of RBAC / status mapping.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCaseMocks = vi.hoisted(() => ({
  openPreparation: vi.fn(),
  sendPreparationAnnouncement: vi.fn(),
  confirmStart: vi.fn(),
  getPreparationState: vi.fn(),
  markPresent: vi.fn(),
  markReady: vi.fn(),
  leavePreparation: vi.fn(),
  PreparationUseCaseError: class PreparationUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

vi.mock("../use-cases/preparation/preparation.use-case.js", () => useCaseMocks);

vi.mock("../use-cases/party/party.use-case.js", () => ({
  getPublicParty: vi.fn(async ({ code }: { code: string }) => ({
    id: "party-1",
    code,
    status: "PREPARATION_OPEN",
  })),
}));

vi.mock("../use-cases/party/participation.use-case.js", () => ({
  getMyParticipation: vi.fn(async () => ({ id: "part-1", status: "PAID" })),
  ParticipationUseCaseError: class ParticipationUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; roles: string[] },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAuth: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    if (!authState.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Non authentifié" },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    c.set("user", authState.user);
    await next();
  },
}));

vi.mock("../middleware/audit.js", () => ({
  auditLog: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

const { default: app } = await import("../index.js");

describe("L4 Preparation RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
  });

  it("rejects unauthenticated open preparation", async () => {
    const res = await app.request("/v1/admin/parties/party-1/preparation/open", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("forbids player role from open preparation", async () => {
    authState.user = { id: "u1", email: "p@test", roles: ["PLAYER"] };
    const res = await app.request("/v1/admin/parties/party-1/preparation/open", { method: "POST" });
    expect(res.status).toBe(403);
    expect(useCaseMocks.openPreparation).not.toHaveBeenCalled();
  });

  it("allows ADMIN open preparation (no auto-start)", async () => {
    authState.user = { id: "admin", email: "a@test", roles: ["ADMIN"] };
    useCaseMocks.openPreparation.mockResolvedValueOnce({ status: "PREPARATION_OPEN" });
    const res = await app.request("/v1/admin/parties/party-1/preparation/open", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("PREPARATION_OPEN");
    expect(useCaseMocks.openPreparation).toHaveBeenCalledWith({
      partyId: "party-1",
      userId: "admin",
    });
  });

  it("allows authenticated player mark-present / mark-ready", async () => {
    authState.user = { id: "player", email: "p@test", roles: ["PLAYER"] };
    useCaseMocks.markPresent.mockResolvedValueOnce({
      id: "p1",
      status: "PRESENT",
      readinessState: "present",
    });
    useCaseMocks.markReady.mockResolvedValueOnce({
      id: "p1",
      status: "READY",
      readinessState: "ready",
    });

    const present = await app.request("/v1/parties/CODE/preparation/mark-present", {
      method: "POST",
    });
    expect(present.status).toBe(200);

    const ready = await app.request("/v1/parties/CODE/preparation/mark-ready", { method: "POST" });
    expect(ready.status).toBe(200);
  });

  it("identifies the current player in a preparation snapshot", async () => {
    authState.user = { id: "player", email: "p@test", roles: ["PLAYER"] };
    useCaseMocks.getPreparationState.mockResolvedValueOnce({
      partyId: "party-1",
      status: "PREPARATION_OPEN",
      participants: [{ id: "part-1", userId: "player", status: "READY" }],
      announcements: [],
      stats: { total: 1, present: 0, ready: 1, noResponse: 0, absent: 0 },
    });

    const res = await app.request("/v1/parties/CODE/preparation");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.selfUserId).toBe("player");
  });

  it("does not expose preparation announcements during an active round", async () => {
    authState.user = { id: "player", email: "p@test", roles: ["PLAYER"] };
    useCaseMocks.getPreparationState.mockResolvedValueOnce({
      partyId: "party-1",
      status: "ROUND_ACTIVE",
      participants: [],
      announcements: [{ id: "private-prep-announcement" }],
      stats: { total: 0, present: 0, ready: 0, noResponse: 0, absent: 0 },
    });

    const res = await app.request("/v1/parties/CODE/preparation");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("PREPARATION_NOT_AVAILABLE");
    expect(JSON.stringify(body)).not.toContain("private-prep-announcement");
  });

  it("maps absent confirmation error on confirm-start", async () => {
    authState.user = { id: "admin", email: "a@test", roles: ["ADMIN"] };
    useCaseMocks.confirmStart.mockRejectedValueOnce(
      new useCaseMocks.PreparationUseCaseError(
        "ABSENT_CONFIRMATION_REQUIRED",
        "raison requise",
        422,
      ),
    );

    // Sensitive commands require control lease (P-A-ADMIN).
    const leaseRes = await app.request("/v1/admin/parties/party-1/control-lease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ttlSeconds: 60 }),
    });
    expect(leaseRes.status).toBe(200);

    const res = await app.request("/v1/admin/parties/party-1/preparation/confirm-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceWithAbsents: true }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("ABSENT_CONFIRMATION_REQUIRED");
  });
});
