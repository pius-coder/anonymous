/**
 * L3 — persistence path for accepted inputs / deadline / nonce idempotency.
 * DB is mocked at the repository boundary (integration-style unit).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "colyseus";
import { addPlayer } from "../handlers/connection-handler.js";
import {
  evaluateRoundCommand,
  handleRoundCommandAsync,
  registerRoundHandlers,
} from "../handlers/round-handler.js";
import { LiveRoomState } from "../rooms/schema/LiveRoomState.js";

const dbMocks = vi.hoisted(() => ({
  realtimeRepository: {
    findByTokenHash: vi.fn(),
    markReconnectingByParticipation: vi.fn(),
    markConnectedByParticipation: vi.fn(),
    markDisconnectedByParticipation: vi.fn(),
  },
  partyRepository: {
    findPartyById: vi.fn(),
    updatePartyStatus: vi.fn(),
  },
  roundRepository: {
    listRoundsByParty: vi.fn(),
    findRoundDeadlineByRoundId: vi.fn(),
    findPlayerActionByNonce: vi.fn(),
    createPlayerAction: vi.fn(),
    claimDueRoundDeadline: vi.fn(),
    updateRoundLifecycle: vi.fn(),
    listRoundParticipants: vi.fn(),
    markRoundParticipantsWaitingReview: vi.fn(),
  },
  participationRepository: {
    updateParticipationStatus: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

function makeClient(sessionId: string): Client {
  return {
    sessionId,
    userData: {},
    send: vi.fn(),
  } as unknown as Client;
}

function makeActiveState(): LiveRoomState {
  const state = new LiveRoomState();
  state.partyId = "party-1";
  state.partyStatus = "ROUND_ACTIVE";
  state.currentRoundId = "round-1";
  state.currentRoundNumber = 1;
  state.currentRoundStatus = "active";
  state.roundDeadlineAt = Date.now() + 60_000;
  return state;
}

function admitPlayer(state: LiveRoomState, client: Client) {
  const player = addPlayer(state, client, {
    participationId: "participation-1",
    partyId: "party-1",
    userId: "user-1",
    role: "player",
    connectionToken: "token",
    participationStatus: "PLAYING",
  });
  player.status = "playing";
  return player;
}

beforeEach(() => {
  vi.clearAllMocks();
  registerRoundHandlers();
  dbMocks.roundRepository.findPlayerActionByNonce.mockResolvedValue(null);
  dbMocks.roundRepository.createPlayerAction.mockResolvedValue({ id: "action-1" });
});

describe("L3 round input persistence and deadline", () => {
  it("persists accepted submit with action nonce", async () => {
    const state = makeActiveState();
    const client = makeClient("s1");
    admitPlayer(state, client);

    const result = await handleRoundCommandAsync(state, client, {
      type: "round:submit",
      payload: { actionNonce: "nonce-1", answer: "x" },
    });

    expect(result).toMatchObject({ accepted: true });
    expect(dbMocks.roundRepository.createPlayerAction).toHaveBeenCalledWith(
      expect.objectContaining({
        roundId: "round-1",
        participationId: "participation-1",
        actionType: "round:submit",
        actionNonce: "nonce-1",
        accepted: true,
      }),
    );
  });

  it("treats duplicate nonce as idempotent without double insert", async () => {
    const state = makeActiveState();
    const client = makeClient("s1");
    admitPlayer(state, client);

    await handleRoundCommandAsync(state, client, {
      type: "round:submit",
      payload: { actionNonce: "nonce-dup", answer: "a" },
    });
    expect(dbMocks.roundRepository.createPlayerAction).toHaveBeenCalledTimes(1);

    const second = await handleRoundCommandAsync(state, client, {
      type: "round:submit",
      payload: { actionNonce: "nonce-dup", answer: "a" },
    });
    expect(second).toMatchObject({ accepted: true, idempotent: true });
    expect(dbMocks.roundRepository.createPlayerAction).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when DB already has the nonce", async () => {
    const state = makeActiveState();
    const client = makeClient("s1");
    admitPlayer(state, client);

    dbMocks.roundRepository.findPlayerActionByNonce.mockResolvedValueOnce({
      id: "existing",
      actionNonce: "nonce-db",
    });

    const result = await handleRoundCommandAsync(state, client, {
      type: "round:submit",
      payload: { actionNonce: "nonce-db" },
    });

    expect(result).toMatchObject({ accepted: true, idempotent: true });
    expect(dbMocks.roundRepository.createPlayerAction).not.toHaveBeenCalled();
  });

  it("rejects late input after round deadline", () => {
    const state = makeActiveState();
    state.roundDeadlineAt = Date.now() - 1_000;
    const client = makeClient("s1");
    admitPlayer(state, client);

    expect(
      evaluateRoundCommand(
        state,
        client,
        { type: "round:submit", payload: { actionNonce: "late-1" } },
        Date.now(),
      ),
    ).toMatchObject({ accepted: false, error: "LATE_INPUT" });
  });

  it("rejects forbidden role before persistence", async () => {
    const state = makeActiveState();
    const client = makeClient("obs");
    addPlayer(state, client, {
      participationId: "p-obs",
      partyId: "party-1",
      userId: "u-obs",
      role: "readObserver",
      connectionToken: "t",
    });

    const result = await handleRoundCommandAsync(state, client, {
      type: "round:submit",
      payload: { actionNonce: "n1" },
    });
    expect(result).toMatchObject({ accepted: false, error: "ROLE_NOT_ALLOWED" });
    expect(dbMocks.roundRepository.createPlayerAction).not.toHaveBeenCalled();
  });

  it("marks finished_round only after successful non-idempotent accept", async () => {
    const state = makeActiveState();
    const client = makeClient("s1");
    const player = admitPlayer(state, client);

    await handleRoundCommandAsync(state, client, {
      type: "round:finish",
      payload: { actionNonce: "finish-1" },
    });
    expect(player.status).toBe("finished_round");
  });
});

describe("L3 server round source", () => {
  it("loads round/status/deadline from repositories, not client fields", async () => {
    dbMocks.partyRepository.findPartyById.mockResolvedValueOnce({
      id: "party-1",
      status: "ROUND_ACTIVE",
    });
    dbMocks.roundRepository.listRoundsByParty.mockResolvedValueOnce([
      {
        id: "round-9",
        number: 2,
        status: "ACTIVE",
        deadline: new Date("2030-01-01T00:00:00.000Z"),
      },
    ]);
    dbMocks.roundRepository.findRoundDeadlineByRoundId.mockResolvedValueOnce({
      deadlineAt: new Date("2030-01-01T00:05:00.000Z"),
    });

    const { loadServerRoundSnapshot } = await import("../rooms/server-round-source.js");
    const snap = await loadServerRoundSnapshot("party-1");

    expect(snap).toMatchObject({
      partyId: "party-1",
      partyStatus: "ROUND_ACTIVE",
      currentRoundId: "round-9",
      currentRoundNumber: 2,
      currentRoundStatus: "active",
      roundDeadlineAt: new Date("2030-01-01T00:05:00.000Z").getTime(),
    });
  });
});
