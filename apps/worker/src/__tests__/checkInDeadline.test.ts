import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    sessionRegistration: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  SessionRegistrationStatus: {
    PAID: "PAID",
    NO_SHOW: "NO_SHOW",
  },
}));

import { processCheckInDeadline } from "../checkInDeadline.js";

function registration(overrides: Record<string, unknown> = {}) {
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAID",
    ...overrides,
  };
}

describe("check-in deadline worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.sessionRegistration.findMany.mockResolvedValue([registration()]);
    dbMocks.prisma.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
  });

  it("does not process before deadline", async () => {
    const result = await processCheckInDeadline(
      {
        sessionId: "session-1",
        checkInDeadlineAt: "2026-07-08T00:15:00Z",
      },
      new Date("2026-07-08T00:14:00Z"),
    );

    expect(result).toEqual({ processed: false, reason: "deadline-not-reached" });
    expect(dbMocks.prisma.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("marks remaining paid players no-show after deadline", async () => {
    const result = await processCheckInDeadline(
      {
        sessionId: "session-1",
        checkInDeadlineAt: "2026-07-08T00:15:00Z",
      },
      new Date("2026-07-08T00:16:00Z"),
    );

    expect(result).toEqual({ processed: true, noShowCount: 1 });
    expect(dbMocks.prisma.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "session-1", status: "PAID" },
        data: expect.objectContaining({ status: "NO_SHOW", noShowAt: expect.any(Date) }),
      }),
    );
    expect(dbMocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "checkin.deadline-reached" }),
      }),
    );
  });
});
