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

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  LivePhase: {
    RESOLVING: "RESOLVING",
  },
  RoundStatus: {
    COMPLETED: "COMPLETED",
  },
}));

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

  it("closes the round and moves live state to resolving after deadline", async () => {
    const result = await processRoundDeadline(
      {
        sessionId: "session-1",
        roundId: "round-1",
        deadlineAt: "2026-07-08T00:00:30Z",
      },
      new Date("2026-07-08T00:00:31Z"),
    );

    expect(result).toEqual({ processed: true, roundId: "round-1", status: "COMPLETED" });
    expect(dbMocks.prisma.roundDeadline.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { closedAt: expect.any(Date) } }),
    );
    expect(dbMocks.prisma.liveSessionState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phase: "RESOLVING" }),
      }),
    );
  });
});
