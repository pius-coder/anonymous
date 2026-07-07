import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

vi.mock("@session-jeu/db", () => ({
  prisma: {
    gameSession: {
      findUnique: vi.fn(),
    },
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
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "TEST-001",
      isPublic: true,
    });

    const res = await app.request("/v1/share/TEST-001");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/session/TEST-001");
  });

  it("should return 404 for invalid token", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue(null);

    const res = await app.request("/v1/share/INVALID");
    expect(res.status).toBe(404);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("LINK_NOT_FOUND");
  });

  it("should redirect for private sessions too (link resolves)", async () => {
    mockPrisma.gameSession.findUnique.mockResolvedValue({
      code: "PRIVATE-001",
      isPublic: false,
    });

    const res = await app.request("/v1/share/PRIVATE-001");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/session/PRIVATE-001");
  });
});
