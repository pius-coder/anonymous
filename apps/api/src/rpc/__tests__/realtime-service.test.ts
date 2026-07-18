import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireRpcRole: vi.fn(),
  requireRpcUser: vi.fn(),
  connectCodeFromHttpStatus: vi.fn((status: number) => {
    if (status === 400) return Code.InvalidArgument;
    if (status === 403) return Code.PermissionDenied;
    if (status === 404) return Code.NotFound;
    if (status === 422) return Code.FailedPrecondition;
    return Code.Internal;
  }),
}));

const liveMocks = vi.hoisted(() => ({
  createLiveAccess: vi.fn(),
  getReadonlySnapshotView: vi.fn(),
  LiveAccessUseCaseError: class LiveAccessUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
      this.name = "LiveAccessUseCaseError";
    }
  },
}));

vi.mock("../auth-context.js", () => authMocks);
vi.mock("../../use-cases/live/live-access.use-case.js", () => ({
  createLiveAccess: liveMocks.createLiveAccess,
  LiveAccessUseCaseError: liveMocks.LiveAccessUseCaseError,
}));
vi.mock("../../use-cases/live/readonly-snapshot.use-case.js", () => ({
  getReadonlySnapshotView: liveMocks.getReadonlySnapshotView,
}));

const { realtimeService } = await import("../realtime-service.js");

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireRpcRole.mockResolvedValue({
    id: "observer-1",
    roles: ["OBSERVER"],
  });
  authMocks.requireRpcUser.mockResolvedValue({
    id: "observer-1",
    roles: ["OBSERVER"],
  });
});

describe("RealtimeService readonly snapshot (L4)", () => {
  it("requires an observer/admin/support role", async () => {
    authMocks.requireRpcRole.mockRejectedValue(
      new ConnectError("Permission insuffisante", Code.PermissionDenied),
    );

    await expect(
      realtimeService.getReadonlySnapshot?.({ partyId: { value: "party-1" } } as never, {} as never),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
    expect(liveMocks.getReadonlySnapshotView).not.toHaveBeenCalled();
  });

  it("returns a readonly snapshot without private fields", async () => {
    liveMocks.getReadonlySnapshotView.mockResolvedValue({
      partyId: "party-1",
      currentPhase: "ACTIVE",
      participantCount: 8,
      connectedCount: 6,
      currentRoundNumber: 2,
      currentRoundStatus: "ACTIVE",
      rounds: [
        {
          roundId: "round-1",
          phase: "SETUP",
          startedAt: "2026-07-18T10:00:00.000Z",
          endsAt: "2026-07-18T10:05:00.000Z",
        },
      ],
    });

    const response = await realtimeService.getReadonlySnapshot?.(
      { partyId: { value: "party-1" } } as never,
      {} as never,
    );

    expect(response?.snapshot?.partyId?.value).toBe("party-1");
    expect(response?.snapshot?.participantCount).toBe(8);
    expect(response?.snapshot?.connectedCount).toBe(6);
    expect(response?.snapshot?.rounds).toHaveLength(1);
    expect(response?.snapshot).not.toHaveProperty("connectionToken");
    expect(response?.snapshot).not.toHaveProperty("provisionalScores");
    expect(response?.snapshot).not.toHaveProperty("userId");
    expect(authMocks.requireRpcRole).toHaveBeenCalledWith(
      expect.anything(),
      "OBSERVER",
      "SUPPORT",
      "ADMIN",
      "SUPER_ADMIN",
    );
  });

  it("maps use-case errors to Connect errors", async () => {
    liveMocks.getReadonlySnapshotView.mockRejectedValue(
      new liveMocks.LiveAccessUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404),
    );

    await expect(
      realtimeService.getReadonlySnapshot?.({ partyId: { value: "missing" } } as never, {} as never),
    ).rejects.toMatchObject({ code: Code.NotFound });
  });
});
