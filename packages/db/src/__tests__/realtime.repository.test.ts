import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  realtimeConnection: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../prisma.js", () => ({ prisma: prismaMock }));

const realtimeRepository = await import("../repositories/realtime.repository.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("realtimeRepository", () => {
  it("upserts one live connection per participation and clears stale disconnect state", async () => {
    prismaMock.realtimeConnection.upsert.mockResolvedValueOnce({ id: "connection-1" });
    const tokenExpiresAt = new Date("2026-07-15T12:00:00.000Z");

    await realtimeRepository.upsertConnection("participation-1", {
      participationId: "participation-1",
      connectionId: "connection-id",
      state: "pending",
      tokenHash: "live-token-hash",
      tokenExpiresAt,
    });

    expect(prismaMock.realtimeConnection.upsert).toHaveBeenCalledWith({
      where: { participationId: "participation-1" },
      create: {
        participationId: "participation-1",
        connectionId: "connection-id",
        state: "pending",
        tokenHash: "live-token-hash",
        tokenExpiresAt,
      },
      update: expect.objectContaining({
        connectionId: "connection-id",
        state: "pending",
        tokenHash: "live-token-hash",
        tokenExpiresAt,
        disconnectedAt: null,
      }),
    });
  });

  it("looks up live connections by token hash only", async () => {
    prismaMock.realtimeConnection.findUnique.mockResolvedValueOnce({ id: "connection-1" });

    await realtimeRepository.findByTokenHash("hashed-token");

    expect(prismaMock.realtimeConnection.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: "hashed-token" },
      include: {
        participation: {
          select: { id: true, partyId: true, userId: true, role: true, status: true },
        },
      },
    });
  });

  it("marks reconnecting by participation id", async () => {
    prismaMock.realtimeConnection.update.mockResolvedValueOnce({ id: "connection-1" });

    await realtimeRepository.markReconnectingByParticipation("participation-1");

    expect(prismaMock.realtimeConnection.update).toHaveBeenCalledWith({
      where: { participationId: "participation-1" },
      data: {
        state: "reconnecting",
        disconnectedAt: expect.any(Date),
      },
    });
  });

  it("marks connected by participation id without creating a second live record", async () => {
    prismaMock.realtimeConnection.update.mockResolvedValueOnce({ id: "connection-1" });

    await realtimeRepository.markConnectedByParticipation("participation-1");

    expect(prismaMock.realtimeConnection.update).toHaveBeenCalledWith({
      where: { participationId: "participation-1" },
      data: {
        state: "connected",
        connectedAt: expect.any(Date),
        disconnectedAt: null,
      },
    });
  });

  it("marks disconnected by participation id", async () => {
    prismaMock.realtimeConnection.update.mockResolvedValueOnce({ id: "connection-1" });

    await realtimeRepository.markDisconnectedByParticipation("participation-1");

    expect(prismaMock.realtimeConnection.update).toHaveBeenCalledWith({
      where: { participationId: "participation-1" },
      data: {
        state: "disconnected",
        disconnectedAt: expect.any(Date),
      },
    });
  });
});
