/**
 * L4: Session + Participation ConnectRPC handlers (in-process router transport).
 * Mount is local to the test — production central router remains SEQ-03 ownership.
 */
import { Code, ConnectError, createClient, createRouterTransport } from "@connectrpc/connect";
import { ParticipationV1, SessionV1 } from "@session-jeu/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useCaseMocks = vi.hoisted(() => ({
  listPublicParties: vi.fn(),
  getPublicPartyById: vi.fn(),
  getAdminParty: vi.fn(),
  createPartyDraft: vi.fn(),
  scheduleParty: vi.fn(),
  registerForPartyById: vi.fn(),
  getParticipationById: vi.fn(),
  listPartyParticipations: vi.fn(),
  PartyUseCaseError: class PartyUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
  ParticipationUseCaseError: class ParticipationUseCaseError extends Error {
    code: string;
    httpStatus: number;
    constructor(code: string, message: string, httpStatus: number) {
      super(message);
      this.code = code;
      this.httpStatus = httpStatus;
    }
  },
}));

const authMocks = vi.hoisted(() => ({
  requireRpcUser: vi.fn(),
  requireRpcRole: vi.fn(),
  connectCodeFromHttpStatus: (status: number) => {
    if (status === 401) return Code.Unauthenticated;
    if (status === 403) return Code.PermissionDenied;
    if (status === 404) return Code.NotFound;
    if (status === 422) return Code.FailedPrecondition;
    return Code.Internal;
  },
}));

vi.mock("../../use-cases/party/party.use-case.js", () => useCaseMocks);
vi.mock("../../use-cases/party/participation.use-case.js", () => useCaseMocks);
vi.mock("../auth-context.js", () => authMocks);

const { sessionService } = await import("../session-service.js");
const { participationService } = await import("../participation-service.js");

function clients() {
  const transport = createRouterTransport(({ service }) => {
    service(SessionV1.SessionService, sessionService);
    service(ParticipationV1.ParticipationService, participationService);
  });
  return {
    session: createClient(SessionV1.SessionService, transport),
    participation: createClient(ParticipationV1.ParticipationService, transport),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.requireRpcUser.mockResolvedValue({
    id: "user-1",
    email: "p@test.local",
    name: "Player",
    avatarUrl: null,
    roles: ["PLAYER"],
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  });
  authMocks.requireRpcRole.mockImplementation(async (_ctx: unknown, ...roles: string[]) => {
    const user = await authMocks.requireRpcUser();
    if (!roles.some((r) => user.roles.includes(r))) {
      throw new ConnectError("Permission insuffisante", Code.PermissionDenied);
    }
    return user;
  });
});

describe("L4 SessionService", () => {
  it("listParties returns only public published parties from use-case", async () => {
    useCaseMocks.listPublicParties.mockResolvedValueOnce({
      parties: [
        {
          id: "p1",
          code: "SEED-PARTY-01",
          name: "Seed",
          status: "SCHEDULED",
          scheduledAt: "2030-01-01T12:00:00.000Z",
          minPlayers: 2,
          maxPlayers: 8,
          participantCount: 1,
        },
      ],
      total: 1,
    });

    const { session } = clients();
    const res = await session.listParties({ pageSize: 10, pageToken: "" });
    expect(res.parties).toHaveLength(1);
    expect(res.parties[0]?.config?.name).toBe("Seed");
    expect(res.parties[0]?.status).toBe(SessionV1.PartyStatus.SCHEDULED);
    // No admin description leakage.
    expect(res.parties[0]?.config?.description).toBe("");
  });

  it("getParty maps inaccessible draft to NotFound for anonymous public path", async () => {
    authMocks.requireRpcUser.mockRejectedValueOnce(
      new ConnectError("Session requise", Code.Unauthenticated),
    );
    useCaseMocks.getPublicPartyById.mockRejectedValueOnce(
      new useCaseMocks.PartyUseCaseError("PARTY_INACCESSIBLE", "non publiee", 404),
    );

    const { session } = clients();
    await expect(session.getParty({ partyId: { value: "draft-id" } })).rejects.toMatchObject({
      code: Code.NotFound,
    });
  });

  it("createParty requires admin role", async () => {
    const { session } = clients();
    await expect(
      session.createParty({
        config: {
          name: "X",
          description: "",
          minPlayers: 2,
          maxPlayers: 8,
          visibility: SessionV1.PartyVisibility.PUBLIC,
          selectedMinigameIds: [],
        },
        createdBy: "",
      }),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });
});

describe("L4 ParticipationService", () => {
  it("attachParticipation is idempotent via use-case", async () => {
    useCaseMocks.registerForPartyById.mockResolvedValue({
      id: "part-1",
      partyId: "party-1",
      userId: "user-1",
      role: "player",
      status: "REGISTERED",
      readinessState: "NOT_READY",
      connectionState: "OFFLINE",
      createdAt: new Date().toISOString(),
    });

    const { participation } = clients();
    const a = await participation.attachParticipation({
      partyId: { value: "party-1" },
      correlationId: { value: "idem-1" },
      role: ParticipationV1.ParticipationRole.PLAYER,
    });
    const b = await participation.attachParticipation({
      partyId: { value: "party-1" },
      correlationId: { value: "idem-1" },
      role: ParticipationV1.ParticipationRole.PLAYER,
    });
    expect(a.participationId).toBe("part-1");
    expect(b.participationId).toBe("part-1");
    expect(useCaseMocks.registerForPartyById).toHaveBeenCalledTimes(2);
  });

  it("rejects player_id spoofing", async () => {
    const { participation } = clients();
    await expect(
      participation.attachParticipation({
        partyId: { value: "party-1" },
        playerId: { value: "other-user" },
        role: ParticipationV1.ParticipationRole.PLAYER,
      }),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });

  it("listParticipations is staff-only", async () => {
    const { participation } = clients();
    await expect(
      participation.listParticipations({ partyId: { value: "party-1" } }),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });

  it("getParticipation surfaces RBAC errors", async () => {
    useCaseMocks.getParticipationById.mockRejectedValueOnce(
      new useCaseMocks.ParticipationUseCaseError("PARTICIPATION_FORBIDDEN", "nope", 403),
    );
    const { participation } = clients();
    await expect(
      participation.getParticipation({ participationId: "part-1" }),
    ).rejects.toMatchObject({ code: Code.PermissionDenied });
  });
});
