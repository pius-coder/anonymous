import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    roundDeadline: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roundInstance: {
      update: vi.fn(),
    },
    liveSessionState: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const redisNotifyMocks = vi.hoisted(() => ({
  publishRoundResolved: vi.fn(),
}));

const fetchMocks = vi.hoisted(() => {
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
  return { mockFetch };
});

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  LivePhase: {
    RESOLVING: "RESOLVING",
  },
  RoundStatus: {
    COMPLETED: "COMPLETED",
  },
}));

vi.mock("../redisNotify.js", () => redisNotifyMocks);

import { processRoundDeadline } from "../roundDeadline.js";

describe("round deadline worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.roundDeadline.findUnique.mockResolvedValue({
      id: "deadline-1",
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: null,
      round: { id: "round-1" },
    });
    dbMocks.prisma.roundDeadline.update.mockReturnValue({ id: "deadline-1" });
    dbMocks.prisma.roundInstance.update.mockReturnValue({
      id: "round-1",
      status: "COMPLETED",
    });
    dbMocks.prisma.liveSessionState.updateMany.mockReturnValue({ count: 1 });
    dbMocks.prisma.auditLog.create.mockReturnValue({ id: "audit-1" });
    dbMocks.prisma.$transaction.mockImplementation(async (operations: unknown[]) => operations);
    fetchMocks.mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "finalized",
        resolutionLogId: "log-1",
        outputHash: "hash-abc",
        output: {
          scores: { p1: 10, p2: 5 },
          ranks: { p1: 1, p2: 2 },
          qualifiedIds: ["p1"],
          eliminatedIds: ["p2"],
          tieGroups: [],
        },
      }),
    });
  });

  it("does not close a round before its deadline", async () => {
    const result = await processRoundDeadline(
      {
        sessionId: "session-1",
        roundId: "round-1",
        deadlineAt: "2026-07-08T00:00:30Z",
      },
      new Date("2026-07-08T00:00:20Z"),
    );

    expect(result).toEqual({ processed: false, reason: "deadline-not-reached" });
    expect(dbMocks.prisma.roundDeadline.findUnique).not.toHaveBeenCalled();
  });

  it("closes the round, finalizes via API, and publishes Redis notification", async () => {
    const result = await processRoundDeadline(
      {
        sessionId: "session-1",
        roundId: "round-1",
        deadlineAt: "2026-07-08T00:00:30Z",
      },
      new Date("2026-07-08T00:00:31Z"),
    );

    expect(result.processed).toBe(true);
    expect(result.roundId).toBe("round-1");
    expect(result.status).toBe("COMPLETED");
    expect(result.finalized).toBe("finalized");
    expect(dbMocks.prisma.roundDeadline.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { closedAt: expect.any(Date) } }),
    );
    expect(dbMocks.prisma.liveSessionState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phase: "RESOLVING" }),
      }),
    );
    expect(fetchMocks.mockFetch).toHaveBeenCalled();
    expect(redisNotifyMocks.publishRoundResolved).toHaveBeenCalledWith({
      sessionId: "session-1",
      roundId: "round-1",
      scores: { p1: 10, p2: 5 },
      ranks: { p1: 1, p2: 2 },
      qualifiedIds: ["p1"],
      eliminatedIds: ["p2"],
      tieGroups: [],
    });
  });

  it("returns already-closed without calling finalize", async () => {
    dbMocks.prisma.roundDeadline.findUnique.mockResolvedValue({
      id: "deadline-1",
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: new Date("2026-07-08T00:00:31Z"),
      round: { id: "round-1" },
    });

    const result = await processRoundDeadline(
      {
        sessionId: "session-1",
        roundId: "round-1",
        deadlineAt: "2026-07-08T00:00:30Z",
      },
      new Date("2026-07-08T00:00:31Z"),
    );

    expect(result).toEqual({ processed: false, reason: "already-closed" });
    expect(fetchMocks.mockFetch).not.toHaveBeenCalled();
  });

  it("handles API failure gracefully without throwing", async () => {
    fetchMocks.mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await processRoundDeadline(
      {
        sessionId: "session-1",
        roundId: "round-1",
        deadlineAt: "2026-07-08T00:00:30Z",
      },
      new Date("2026-07-08T00:00:31Z"),
    );

    expect(result.processed).toBe(true);
    expect(result.finalized).toBe("errored");
    expect(redisNotifyMocks.publishRoundResolved).not.toHaveBeenCalled();
  });
});
