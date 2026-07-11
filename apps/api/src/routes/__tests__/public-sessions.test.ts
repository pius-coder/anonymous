import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("@session-jeu/shared", () => ({
  PAGINATION_DEFAULTS: { PAGE: 1, LIMIT: 20, MAX_LIMIT: 50 },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: {
    gameSession: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  GameSessionStatus: {
    PUBLISHED: "PUBLISHED",
    ACTIVE: "ACTIVE",
    LIVE: "LIVE",
    DRAFT: "DRAFT",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
  SessionRegistrationStatus: {
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
    CANCELLED: "CANCELLED",
  },
  SessionVisibility: { PUBLIC: "PUBLIC", UNLISTED: "UNLISTED", PRIVATE: "PRIVATE" },
}));

import { prisma } from "@session-jeu/db";
import publicSessions from "../public/sessions.js";

const mockPrisma = vi.mocked(prisma);

describe("GET /v1/public/sessions", () => {
  const app = new Hono();
  app.route("/v1/public/sessions", publicSessions);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return public sessions with 200", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(1);
    mockPrisma.gameSession.findMany.mockResolvedValue([
      {
        code: "TEST-001",
        name: "Test Session",
        description: "A test session",
        entryFee: 1000,
        maxPlayers: 20,
        prizePool: 12000,
        startTime: new Date("2026-07-15T20:00:00Z"),
        endTime: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        _count: { registrations: 2 },
      },
    ] as never);

    const res = await app.request("/v1/public/sessions");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions as Record<string, unknown>[]).toHaveLength(1);
    const session = (data.sessions as Record<string, unknown>[])[0];
    expect(session.visibility).toBe("PUBLIC");
    expect(session.registrationCount).toBe(2);
  });

  it("should compute placesRemaining correctly", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(1);
    mockPrisma.gameSession.findMany.mockResolvedValue([
      {
        code: "TEST-001",
        name: "Test Session",
        description: null,
        entryFee: 500,
        maxPlayers: 10,
        prizePool: 5000,
        startTime: null,
        endTime: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        _count: { registrations: 3 },
      },
    ] as never);

    const res = await app.request("/v1/public/sessions");
    const body = (await res.json()) as Record<string, unknown>;
    const d = body.data as Record<string, unknown>;
    const session = (d.sessions as Record<string, unknown>[])[0];
    expect(session.placesRemaining).toBe(7); // 10 - 3
  });

  it("should return placesRemaining as 0 when session is full", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(1);
    mockPrisma.gameSession.findMany.mockResolvedValue([
      {
        code: "FULL-001",
        name: "Full Session",
        description: null,
        entryFee: 500,
        maxPlayers: 5,
        prizePool: 0,
        startTime: null,
        endTime: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        _count: { registrations: 10 },
      },
    ] as never);

    const res = await app.request("/v1/public/sessions");
    const body = (await res.json()) as Record<string, unknown>;
    const d = body.data as Record<string, unknown>;
    const session = (d.sessions as Record<string, unknown>[])[0];
    expect(session.placesRemaining).toBe(0); // max(0, 5 - 10)
  });

  it("should return pagination meta", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(25);
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    const res = await app.request("/v1/public/sessions?page=2&limit=10");
    const body = (await res.json()) as Record<string, unknown>;
    const d = body.data as Record<string, unknown>;
    expect(d.total).toBe(25);
    expect(d.page).toBe(2);
    expect(d.limit).toBe(10);
    expect(d.totalPages).toBe(3);
  });

  it("should handle empty catalogue", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(0);
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    const res = await app.request("/v1/public/sessions");
    const body = (await res.json()) as Record<string, unknown>;
    const d = body.data as Record<string, unknown>;
    expect(d.sessions).toEqual([]);
    expect(d.total).toBe(0);
  });

  it("should only query PUBLIC visibility sessions with valid status", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(0);
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    await app.request("/v1/public/sessions");

    expect(mockPrisma.gameSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "PUBLIC",
          status: { in: ["PUBLISHED", "ACTIVE", "LIVE"] },
        }),
      }),
    );
  });

  it("should query only LIVE sessions with the live filter", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(0);
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    await app.request("/v1/public/sessions?filter=live");

    expect(mockPrisma.gameSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "PUBLIC",
          status: "LIVE",
        }),
      }),
    );
  });

  it("should query only ACTIVE sessions with the open filter", async () => {
    mockPrisma.gameSession.count.mockResolvedValue(0);
    mockPrisma.gameSession.findMany.mockResolvedValue([]);

    await app.request("/v1/public/sessions?filter=open");

    expect(mockPrisma.gameSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibility: "PUBLIC",
          status: "ACTIVE",
        }),
      }),
    );
  });
});
