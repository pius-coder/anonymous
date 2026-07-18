import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  partyRepository: {
    findPartyById: vi.fn(),
    findPartyByCode: vi.fn(),
    createParty: vi.fn(),
    updateParty: vi.fn(),
    updatePartyStatus: vi.fn(),
    listParties: vi.fn(),
  },
  participationRepository: {
    countByPartyId: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

import {
  PartyUseCaseError,
  updatePartyConfig,
  cancelParty,
  listAdminParties,
} from "../party.use-case.js";

function draftParty(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    code: "CODE1",
    name: "Test",
    status: "DRAFT",
    visibility: "public",
    scheduledAt: null,
    minPlayers: 2,
    maxPlayers: 32,
    roundProgram: null,
    description: null,
    entryFeeAmount: null,
    entryFeeCurrency: "XAF",
    configVersion: 1,
    feeVersion: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("party admin concurrency (L3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.participationRepository.countByPartyId.mockResolvedValue(0);
    dbMocks.auditRepository.createAuditLog.mockResolvedValue({});
  });

  it("rejects stale expectedUpdatedAt on config update", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValue(draftParty());
    await expect(
      updatePartyConfig({
        id: "p1",
        name: "New",
        expectedUpdatedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "STALE_STATE", httpStatus: 409 });
    expect(dbMocks.partyRepository.updateParty).not.toHaveBeenCalled();
  });

  it("rejects stale configVersion", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValue(draftParty({ configVersion: 3 }));
    await expect(
      updatePartyConfig({
        id: "p1",
        name: "New",
        expectedConfigVersion: 1,
      }),
    ).rejects.toMatchObject({ code: "STALE_STATE" });
  });

  it("cancels draft with audit reason", async () => {
    const party = draftParty();
    dbMocks.partyRepository.findPartyById.mockResolvedValue(party);
    dbMocks.partyRepository.updatePartyStatus.mockResolvedValue({
      ...party,
      status: "CANCELLED",
      updatedAt: new Date("2026-01-01T01:00:00.000Z"),
    });

    const result = await cancelParty({
      id: "p1",
      actorId: "admin-1",
      reason: "test cancel",
      expectedUpdatedAt: party.updatedAt.toISOString(),
    });
    expect(result.status).toBe("CANCELLED");
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalled();
  });

  it("lists admin parties with fee fields", async () => {
    dbMocks.partyRepository.listParties.mockResolvedValue([
      draftParty({ entryFeeAmount: { toNumber: () => 500 }, configVersion: 2 }),
    ]);
    const result = await listAdminParties({ take: 10 });
    expect(result.total).toBe(1);
    expect(result.parties[0].entryFeeAmount).toBe(500);
    expect(result.parties[0].configVersion).toBe(2);
  });

  it("maps PartyUseCaseError codes for multi-admin messaging", () => {
    const err = new PartyUseCaseError("STALE_STATE", "stale", 409);
    expect(err.code).toBe("STALE_STATE");
    expect(err.httpStatus).toBe(409);
  });
});
