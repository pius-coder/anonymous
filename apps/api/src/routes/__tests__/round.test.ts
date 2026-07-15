import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
}));

const roundUseCaseMocks = vi.hoisted(() => {
  class RoundUseCaseError extends Error {
    readonly code: string;
    readonly httpStatus: number;

    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  }

  return {
    RoundUseCaseError,
    configureRound: vi.fn(),
    startRoundBriefing: vi.fn(),
    activateRound: vi.fn(),
    pauseRound: vi.fn(),
    resumeRound: vi.fn(),
    closeRound: vi.fn(),
    finishPlayerRound: vi.fn(),
  };
});

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("../../use-cases/round/round.use-case.js", () => roundUseCaseMocks);

const sessionToken = "session-token";

function authenticatedRequest(
  path: string,
  roles: string[] = ["ADMIN"],
  body: Record<string, unknown> = { roundNumber: 1, minigameId: "memory-sequence", actionNonce: "nonce-1" },
): Promise<Response> {
  dbMocks.authRepository.findAuthSessionByToken.mockResolvedValueOnce({
    id: "session-1",
    token: hashOpaqueToken(sessionToken),
    expiresAt: new Date(Date.now() + 60_000),
    sessionVersion: 1,
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      avatarUrl: null,
      sessionVersion: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      roleAssignments: roles.map((role) => ({ role })),
    },
  });

  return app.request(path, {
    method: "POST",
    headers: {
      cookie: `__session=${sessionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.ALLOW_INSECURE_AUTH_COOKIE = "true";
  vi.clearAllMocks();
  roundUseCaseMocks.configureRound.mockResolvedValue({
    roundId: "round-1",
    partyId: "party-1",
    roundNumber: 1,
    status: "SETUP",
    deadlineAt: null,
  });
  roundUseCaseMocks.finishPlayerRound.mockResolvedValue({
    status: "FINISHED_ROUND",
    duplicate: false,
  });
  dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
});

afterEach(() => {
  delete process.env.ALLOW_INSECURE_AUTH_COOKIE;
});

describe("round routes", () => {
  it("AC-10-01 requires a session for admin round commands", async () => {
    const res = await app.request("/v1/admin/parties/party-1/rounds/configure", {
      method: "POST",
      body: JSON.stringify({ roundNumber: 1, minigameId: "memory-sequence" }),
    });

    expect(res.status).toBe(401);
  });

  it("AC-10-01 requires an admin role for admin round commands", async () => {
    const res = await authenticatedRequest("/v1/admin/parties/party-1/rounds/configure", ["PLAYER"]);

    expect(res.status).toBe(403);
  });

  it("AC-10-01 lets an admin configure a round", async () => {
    const res = await authenticatedRequest("/v1/admin/parties/party-1/rounds/configure", ["ADMIN"]);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(roundUseCaseMocks.configureRound).toHaveBeenCalledWith(expect.objectContaining({
      partyId: "party-1",
      configuredBy: "admin-1",
    }));
  });

  it("AC-10-03 lets an authenticated player finish a round", async () => {
    const res = await authenticatedRequest("/v1/rounds/round-1/finish", ["PLAYER"]);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ status: "FINISHED_ROUND", duplicate: false });
    expect(roundUseCaseMocks.finishPlayerRound).toHaveBeenCalledWith(expect.objectContaining({
      roundId: "round-1",
      userId: "admin-1",
      actionNonce: "nonce-1",
    }));
  });

  it("rejects oversized player action payloads", async () => {
    const res = await authenticatedRequest("/v1/rounds/round-1/finish", ["PLAYER"], {
      actionNonce: "nonce-oversized",
      payload: {
        answer: "x".repeat(501),
      },
    });

    expect(res.status).toBe(400);
    expect(roundUseCaseMocks.finishPlayerRound).not.toHaveBeenCalled();
  });
});
