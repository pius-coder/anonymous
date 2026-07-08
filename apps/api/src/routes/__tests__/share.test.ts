import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("@session-jeu/db", () => ({
  prisma: {
    shareLink: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((queries: unknown[]) => Promise.resolve(queries.map(() => ({})))),
  },
  GameSessionStatus: {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
}));

import { prisma } from "@session-jeu/db";
import share from "../share.js";

const mockPrisma = vi.mocked(prisma);

describe("GET /v1/share/:token", () => {
  const app = new Hono();
  app.route("/v1/share", share);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to session detail for valid token", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue({
      id: "link-1",
      sessionId: "session-1",
      clickCount: 0,
      session: {
        code: "TEST-001",
        visibility: "PUBLIC",
        status: "PUBLISHED",
      },
    });

    const res = await app.request("/v1/share/valid-token");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/session/TEST-001");
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("should return 404 for invalid token", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue(null);

    const res = await app.request("/v1/share/INVALID");
    expect(res.status).toBe(404);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("LINK_NOT_FOUND");
  });

  it("should return 403 for private session", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue({
      id: "link-2",
      sessionId: "session-2",
      clickCount: 0,
      session: {
        code: "PRIVATE-001",
        visibility: "PRIVATE",
        status: "PUBLISHED",
      },
    });

    const res = await app.request("/v1/share/private-token");
    expect(res.status).toBe(403);
  });

  it("should return 410 for completed session", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue({
      id: "link-3",
      sessionId: "session-3",
      clickCount: 0,
      session: {
        code: "COMPLETED-001",
        visibility: "PUBLIC",
        status: "COMPLETED",
      },
    });

    const res = await app.request("/v1/share/completed-token");
    expect(res.status).toBe(410);
  });

  it("should return 410 for cancelled session", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue({
      id: "link-4",
      sessionId: "session-4",
      clickCount: 0,
      session: {
        code: "CANCELLED-001",
        visibility: "UNLISTED",
        status: "CANCELLED",
      },
    });

    const res = await app.request("/v1/share/cancelled-token");
    expect(res.status).toBe(410);
  });

  it("should redirect for unlisted session", async () => {
    mockPrisma.shareLink.findUnique.mockResolvedValue({
      id: "link-5",
      sessionId: "session-5",
      clickCount: 0,
      session: {
        code: "UNLISTED-001",
        visibility: "UNLISTED",
        status: "PUBLISHED",
      },
    });

    const res = await app.request("/v1/share/unlisted-token");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/session/UNLISTED-001");
  });
});
