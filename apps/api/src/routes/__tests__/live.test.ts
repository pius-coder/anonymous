import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../index.js";
import { hashOpaqueToken } from "../../auth/session.js";

const dbMocks = vi.hoisted(() => ({
  authRepository: {
    findAuthSessionByToken: vi.fn(),
    revokeAuthSession: vi.fn(),
  },
  partyRepository: {
    findPartyById: vi.fn(),
  },
  participationRepository: {
    findParticipation: vi.fn(),
  },
  roundRepository: {
    listRoundsByParty: vi.fn(),
  },
  realtimeRepository: {
    upsertConnection: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const sessionToken = "session-token";

function authenticatedRequest(path: string): Promise<Response> {
  return app.request(path, {
    method: "POST",
    headers: { cookie: `__session=${sessionToken}` },
  });
}

function mockAuthSession() {
  dbMocks.authRepository.findAuthSessionByToken.mockResolvedValue({
    id: "session-1",
    token: hashOpaqueToken(sessionToken),
    expiresAt: new Date(Date.now() + 60_000),
    sessionVersion: 1,
    user: {
      id: "user-1",
      email: "player@example.com",
      name: "Player One",
      avatarUrl: null,
      sessionVersion: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      roleAssignments: [],
    },
  });
}

beforeEach(() => {
  process.env.ALLOW_INSECURE_AUTH_COOKIE = "true";
  process.env.GAME_WS_URL = "ws://live.test";
  vi.clearAllMocks();
  mockAuthSession();
  dbMocks.partyRepository.findPartyById.mockResolvedValue({
    id: "party-1",
    status: "ROUND_ACTIVE",
  });
  dbMocks.roundRepository.listRoundsByParty.mockResolvedValue([
    { id: "round-1", number: 1, status: "ACTIVE", deadline: null },
  ]);
  dbMocks.participationRepository.findParticipation.mockResolvedValue({
    id: "participation-1",
    partyId: "party-1",
    userId: "user-1",
    role: "PLAYER",
    status: "READY",
    paymentState: "PAID",
    admissionState: "ADMITTED",
  });
  dbMocks.realtimeRepository.upsertConnection.mockImplementation((_participationId, data) =>
    Promise.resolve({
      id: "connection-1",
      ...data,
      connectedAt: new Date("2026-01-01T00:00:00.000Z"),
      disconnectedAt: null,
    }),
  );
});

afterEach(() => {
  delete process.env.ALLOW_INSECURE_AUTH_COOKIE;
  delete process.env.GAME_WS_URL;
});

describe("POST /v1/live/parties/:partyId/access", () => {
  it("creates a short live access token for an authenticated participant", async () => {
    const res = await authenticatedRequest("/v1/live/parties/party-1/access");

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      roomId: "party-1",
      endpoint: "ws://live.test",
    });
    expect(body.data.connectionToken).toEqual(expect.any(String));
    expect(body.data.expiresAt).toEqual(expect.any(String));
    expect(dbMocks.realtimeRepository.upsertConnection).toHaveBeenCalledWith(
      "participation-1",
      expect.objectContaining({
        participationId: "participation-1",
        state: "pending",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        tokenExpiresAt: expect.any(Date),
      }),
    );
    expect(dbMocks.realtimeRepository.upsertConnection.mock.calls[0]?.[1].tokenHash).not.toBe(
      body.data.connectionToken,
    );
  });

  it("rejects callers without a session", async () => {
    const res = await app.request("/v1/live/parties/party-1/access", { method: "POST" });

    expect(res.status).toBe(401);
  });

  it("rejects a user who is not a participant", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce(null);

    const res = await authenticatedRequest("/v1/live/parties/party-1/access");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("PARTICIPATION_NOT_FOUND");
  });

  it("rejects parties outside live phases", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValueOnce({
      id: "party-1",
      status: "REGISTRATION_OPEN",
    });

    const res = await authenticatedRequest("/v1/live/parties/party-1/access");
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error.code).toBe("PARTY_NOT_LIVE");
  });

  it("rejects unpaid players before issuing live access", async () => {
    dbMocks.participationRepository.findParticipation.mockResolvedValueOnce({
      id: "participation-1",
      partyId: "party-1",
      userId: "user-1",
      role: "PLAYER",
      status: "READY",
      paymentState: "NONE",
      admissionState: "PENDING",
    });

    const res = await authenticatedRequest("/v1/live/parties/party-1/access");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("PAYMENT_REQUIRED");
  });
});
