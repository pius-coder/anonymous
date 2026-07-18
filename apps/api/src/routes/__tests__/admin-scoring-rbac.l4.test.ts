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
}));

const scoringMocks = vi.hoisted(() => {
  class ScoringUseCaseError extends Error {
    readonly code: string;
    readonly httpStatus: number;

    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  }

  return {
    ScoringUseCaseError,
    getAdminScoreVerificationDossier: vi.fn(),
    correctProvisionalScore: vi.fn(),
    publishResults: vi.fn(),
  };
});

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("../../use-cases/scoring/scoring.use-case.js", () => scoringMocks);

const sessionToken = "session-token-admin-scoring";

function authed(path: string, roles: string[], init?: RequestInit) {
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

  return app.request(path, {
    ...init,
    headers: {
      cookie: `__session=${sessionToken}`,
      "content-type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

describe("admin scoring routes (L4)", () => {
  beforeEach(() => {
    process.env.ALLOW_INSECURE_AUTH_COOKIE = "true";
    vi.clearAllMocks();
    dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
    scoringMocks.getAdminScoreVerificationDossier.mockResolvedValue({
      partyId: "party-1",
      roundId: "round-1",
      status: "VERIFIED",
      rows: [],
      metrics: {
        mismatchCount: 0,
        reviewCount: 0,
        publicationDelayMs: null,
        expectedGainTotal: 0,
        creditedGainTotal: 0,
      },
      published: false,
    });
    scoringMocks.correctProvisionalScore.mockResolvedValue({ version: "2026-01-01T00:00:01.000Z" });
    scoringMocks.publishResults.mockResolvedValue({
      roundId: "round-1",
      partyId: "party-1",
      alreadyPublished: false,
      publishedCount: 1,
      scores: [],
    });
  });

  it("rejects unauthenticated dossier read", async () => {
    const res = await app.request("/v1/admin/parties/party-1/scores?roundId=round-1");
    expect(res.status).toBe(401);
  });

  it("rejects non-admin dossier read", async () => {
    const res = await authed("/v1/admin/parties/party-1/scores?roundId=round-1", ["PLAYER"], {
      method: "GET",
    });
    expect(res.status).toBe(403);
  });

  it("returns admin dossier for admin role", async () => {
    const res = await authed("/v1/admin/parties/party-1/scores?roundId=round-1", ["ADMIN"], {
      method: "GET",
    });
    expect(res.status).toBe(200);
    expect(scoringMocks.getAdminScoreVerificationDossier).toHaveBeenCalledWith("party-1", "round-1");
  });

  it("passes expectedVersion on correction", async () => {
    const res = await authed("/v1/admin/parties/party-1/scores/round-1/corrections", ["ADMIN"], {
      method: "POST",
      body: JSON.stringify({
        playerId: "player-1",
        correctedScore: 12,
        reason: "Evidence review",
        expectedVersion: "2026-01-01T00:00:00.000Z",
      }),
    });

    expect(res.status).toBe(200);
    expect(scoringMocks.correctProvisionalScore).toHaveBeenCalledWith(
      expect.objectContaining({
        roundId: "round-1",
        playerId: "player-1",
        expectedVersion: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("returns typed publish block when evidence is invalid", async () => {
    scoringMocks.publishResults.mockRejectedValue(
      new scoringMocks.ScoringUseCaseError("EVIDENCE_MISMATCH", "hash evidence mismatch", 422),
    );

    const res = await authed("/v1/admin/parties/party-1/scores/round-1/publish", ["ADMIN"], {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("EVIDENCE_MISMATCH");
  });
});
