import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRpcRole: vi.fn(),
  requireRpcUser: vi.fn(),
  connectCodeFromHttpStatus: vi.fn((status: number) => {
    if (status === 400) return Code.InvalidArgument;
    if (status === 403) return Code.PermissionDenied;
    if (status === 404) return Code.NotFound;
    if (status === 409) return Code.AlreadyExists;
    if (status === 422) return Code.FailedPrecondition;
    return Code.Internal;
  }),
}));

const useCaseMocks = vi.hoisted(() => ({
  listProvisionalScores: vi.fn(),
  correctProvisionalScore: vi.fn(),
  publishResults: vi.fn(),
  getPublishedResults: vi.fn(),
  ScoringUseCaseError: class ScoringUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
      this.name = "ScoringUseCaseError";
    }
  },
}));

vi.mock("../auth-context.js", () => authMocks);
vi.mock("../../use-cases/scoring/scoring.use-case.js", () => useCaseMocks);

const { scoringService } = await import("../scoring-service.js");

const admin = { id: "admin-1", roles: ["ADMIN"], email: "a@test", name: "Admin", avatarUrl: null, sessionVersion: 1, createdAt: new Date().toISOString() };
const player = { id: "player-1", roles: ["PLAYER"], email: "p@test", name: "Player", avatarUrl: null, sessionVersion: 1, createdAt: new Date().toISOString() };

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireRpcRole.mockImplementation(async (_ctx: unknown, ...roles: string[]) => {
    if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
      throw new ConnectError("Permission insuffisante", Code.PermissionDenied);
    }
    return admin;
  });
  authMocks.requireRpcUser.mockResolvedValue(player);
});

describe("ScoringService RBAC / no-leak (L4)", () => {
  it("listProvisionalScores requires admin role", async () => {
    authMocks.requireRpcRole.mockRejectedValue(
      new ConnectError("Permission insuffisante", Code.PermissionDenied),
    );
    await expect(
      scoringService.listProvisionalScores?.(
        { roundId: "round-1" } as never,
        {} as never,
      ),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
    expect(useCaseMocks.listProvisionalScores).not.toHaveBeenCalled();
  });

  it("admin can list provisional scores with ADMIN audience", async () => {
    useCaseMocks.listProvisionalScores.mockResolvedValue({
      roundId: "round-1",
      partyId: "party-1",
      aggregateStatus: "PROVISIONAL",
      audience: "admin",
      scores: [
        {
          provisionalScoreId: "prov-1",
          roundId: "round-1",
          participationId: "part-1",
          playerId: "player-1",
          playerName: null,
          score: 42,
          rank: 1,
          status: "PROVISIONAL",
          version: "2026-01-01T00:00:00.000Z",
          evidenceSummary: "src:test",
          reviewedBy: null,
          reviewedAt: null,
        },
      ],
    });

    const response = await scoringService.listProvisionalScores?.(
      { roundId: "round-1" } as never,
      {} as never,
    );
    expect(response?.scores?.[0]?.score).toBe(42);
    expect(response?.audience).toBe(2); // ADMIN
    expect(authMocks.requireRpcRole).toHaveBeenCalledWith(
      expect.anything(),
      "ADMIN",
      "SUPER_ADMIN",
    );
  });

  it("player getPublishedResults never includes provisional scores", async () => {
    useCaseMocks.getPublishedResults.mockResolvedValue({
      roundId: "round-1",
      partyId: "party-1",
      scores: [],
      publishedAt: null,
      audience: "player",
      waitingVerification: true,
    });

    const response = await scoringService.getPublishedResults?.(
      { partyId: { value: "party-1" } } as never,
      {} as never,
    );

    expect(response?.finalScores).toEqual([]);
    expect(response?.publishedAt).toBeUndefined();
    expect(JSON.stringify(response)).not.toMatch(/provisional/i);
    expect(useCaseMocks.listProvisionalScores).not.toHaveBeenCalled();
  });

  it("player getPublishedResults returns only published final scores", async () => {
    useCaseMocks.getPublishedResults.mockResolvedValue({
      roundId: "round-1",
      partyId: "party-1",
      scores: [
        {
          roundId: "round-1",
          partyId: "party-1",
          playerId: "player-1",
          playerName: null,
          score: 99,
          rank: 1,
          publishedAt: "2026-01-02T00:00:00.000Z",
          publishedBy: "admin-1",
        },
      ],
      publishedAt: "2026-01-02T00:00:00.000Z",
      audience: "player",
      waitingVerification: false,
    });

    const response = await scoringService.getPublishedResults?.(
      { partyId: { value: "party-1" } } as never,
      {} as never,
    );
    expect(response?.finalScores).toHaveLength(1);
    expect(response?.finalScores?.[0]?.score).toBe(99);
    expect(response?.audience).toBe(1); // PLAYER
  });

  it("correctProvisionalScore rejects missing reason via use-case error mapping", async () => {
    useCaseMocks.correctProvisionalScore.mockRejectedValue(
      new useCaseMocks.ScoringUseCaseError(
        "AUDIT_REASON_REQUIRED",
        "Une raison d'audit est obligatoire",
        400,
      ),
    );

    await expect(
      scoringService.correctProvisionalScore?.(
        {
          roundId: "round-1",
          playerId: { value: "player-1" },
          correctedScore: 10,
          reason: "",
        } as never,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(ConnectError);
  });

  it("publishResults requires admin", async () => {
    useCaseMocks.publishResults.mockResolvedValue({
      roundId: "round-1",
      partyId: "party-1",
      alreadyPublished: false,
      publishedCount: 1,
      scores: [],
    });

    await scoringService.publishResults?.(
      { roundId: "round-1", partyId: { value: "party-1" } } as never,
      {} as never,
    );
    expect(authMocks.requireRpcRole).toHaveBeenCalledWith(
      expect.anything(),
      "ADMIN",
      "SUPER_ADMIN",
    );
    expect(useCaseMocks.publishResults).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "admin-1" }),
    );
  });
});
