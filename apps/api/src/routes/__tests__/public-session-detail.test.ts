import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("@session-jeu/db", () => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
  },
  GameSessionStatus: {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
    ACTIVE: "ACTIVE",
    LIVE: "LIVE",
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
import publicSessionDetail from "../public/session-detail.js";

const mockPrisma = vi.mocked(prisma);

describe("GET /v1/public/sessions/:code", () => {
  const app = new Hono();
  app.route("/v1/public/sessions", publicSessionDetail);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return session detail for PUBLIC session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "TEST-001",
      name: "Test Session",
      description: "A test",
      entryFee: 1000,
      maxPlayers: 20,
      prizePool: 12000,
      startTime: new Date("2026-07-15T20:00:00Z"),
      endTime: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      _count: { registrations: 5 },
    } as never);

    const res = await app.request("/v1/public/sessions/TEST-001");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      code: "TEST-001",
      name: "Test Session",
      placesRemaining: 15,
      registrationCount: 5,
    });
  });

  it("should return session detail for UNLISTED session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "UNLISTED-001",
      name: "Unlisted Session",
      description: "Direct link only",
      entryFee: 500,
      maxPlayers: 10,
      prizePool: 3000,
      startTime: new Date("2026-07-14T19:00:00Z"),
      endTime: null,
      status: "PUBLISHED",
      visibility: "UNLISTED",
      _count: { registrations: 2 },
    } as never);

    const res = await app.request("/v1/public/sessions/UNLISTED-001");
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data.visibility).toBe("UNLISTED");
  });

  it("should return 404 for PRIVATE session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "PRIVATE-001",
      name: "Private",
      visibility: "PRIVATE",
      _count: { registrations: 0 },
    } as never);

    const res = await app.request("/v1/public/sessions/PRIVATE-001");
    expect(res.status).toBe(404);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  it("should return 404 for DRAFT session even if code is known", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "DRAFT-001",
      name: "Draft",
      description: null,
      entryFee: 500,
      maxPlayers: 10,
      prizePool: 0,
      startTime: null,
      endTime: null,
      status: "DRAFT",
      visibility: "PUBLIC",
      _count: { registrations: 0 },
    } as never);

    const res = await app.request("/v1/public/sessions/DRAFT-001");
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
    expect(body.error.message).toBe("Session not found");
  });

  it("should return 404 for non-existent session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue(null);

    const res = await app.request("/v1/public/sessions/NOPE-001");
    expect(res.status).toBe(404);
  });

  it("should return 410 for CLOSED session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "CLOSED-001",
      name: "Closed",
      description: null,
      entryFee: 500,
      maxPlayers: 10,
      prizePool: 0,
      startTime: null,
      endTime: null,
      status: "COMPLETED",
      visibility: "PUBLIC",
      _count: { registrations: 8 },
    } as never);

    const res = await app.request("/v1/public/sessions/CLOSED-001");
    expect(res.status).toBe(410);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error.code).toBe("SESSION_CLOSED");
  });

  it("should return 410 for CANCELLED session", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "CANCEL-001",
      name: "Cancelled",
      description: null,
      entryFee: 500,
      maxPlayers: 10,
      prizePool: 0,
      startTime: null,
      endTime: null,
      status: "CANCELLED",
      visibility: "PUBLIC",
      _count: { registrations: 0 },
    } as never);

    const res = await app.request("/v1/public/sessions/CANCEL-001");
    expect(res.status).toBe(410);
  });

  it("should compute placesRemaining as max(0, ...)", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "OVERFLOW",
      name: "Overflow",
      description: null,
      entryFee: 500,
      maxPlayers: 5,
      prizePool: 0,
      startTime: null,
      endTime: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      _count: { registrations: 12 },
    } as never);

    const res = await app.request("/v1/public/sessions/OVERFLOW");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.data).toMatchObject({ placesRemaining: 0 });
  });
});
