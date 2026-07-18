import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "colyseus";
import { Encoder } from "@colyseus/schema";
import { validateLiveToken } from "../auth/live-auth.js";
import { addPlayer, markDisconnected, markReconnected } from "../handlers/connection-handler.js";
import { dispatchCommand } from "../handlers/command-dispatcher.js";
import { getAdminSnapshot, getReadonlySnapshot } from "../handlers/readonly-handler.js";
import { registerRoundHandlers } from "../handlers/round-handler.js";
import { registerReadonlyHandlers } from "../handlers/readonly-handler.js";
import { applyMovementTick, registerMovementHandler } from "../handlers/movement-handler.js";
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
    listRoundsByParty: vi.fn().mockResolvedValue([]),
    findRoundDeadlineByRoundId: vi.fn().mockResolvedValue(null),
    findPlayerActionByNonce: vi.fn().mockResolvedValue(null),
    createPlayerAction: vi.fn().mockResolvedValue({ id: "action" }),
    claimDueRoundDeadline: vi.fn(),
    updateRoundLifecycle: vi.fn(),
    listRoundParticipants: vi.fn().mockResolvedValue([]),
    markRoundParticipantsWaitingReview: vi.fn(),
  },
  participationRepository: {
    findParticipationById: vi.fn(),
    updateParticipation: vi.fn(),
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

function makeState(): LiveRoomState {
  const state = new LiveRoomState();
  state.partyId = "party-1";
  state.partyStatus = "ROUND_ACTIVE";
  state.currentRoundNumber = 1;
  state.currentRoundStatus = "active";
  return state;
}

function addLivePlayer(state: LiveRoomState, client: Client, role = "player") {
  return addPlayer(state, client, {
    participationId: `${client.sessionId}-participation`,
    partyId: "party-1",
    userId: `${client.sessionId}-user`,
    role,
    connectionToken: "live-token",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  registerRoundHandlers();
  registerReadonlyHandlers();
  registerMovementHandler();
  dbMocks.partyRepository.findPartyById.mockResolvedValue({
    id: "party-1",
    status: "ROUND_ACTIVE",
  });
  dbMocks.roundRepository.listRoundsByParty.mockResolvedValue([
    { id: "round-1", number: 1, status: "ACTIVE", deadline: null },
  ]);
  dbMocks.participationRepository.findParticipationById.mockResolvedValue({
    id: "participation-1",
    partyId: "party-1",
    userId: "user-1",
    role: "PLAYER",
    status: "READY",
    paymentState: "PAID",
    admissionState: "ADMITTED",
  });
});

describe("live token validation", () => {
  it("accepts active participation tokens", async () => {
    dbMocks.realtimeRepository.findByTokenHash.mockResolvedValueOnce({
      id: "connection-1",
      participationId: "participation-1",
      connectionId: "connection-id",
      state: "pending",
      tokenHash: "live-token-hash",
      tokenExpiresAt: new Date(Date.now() + 60_000),
      connectedAt: new Date(),
      disconnectedAt: null,
      participation: {
        id: "participation-1",
        partyId: "party-1",
        userId: "user-1",
        role: "PLAYER",
        status: "READY",
      },
    });

    await expect(validateLiveToken("live-token")).resolves.toMatchObject({
      valid: true,
      participationId: "participation-1",
      partyId: "party-1",
      userId: "user-1",
      role: "player",
    });
    expect(dbMocks.realtimeRepository.findByTokenHash).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it("rejects absent participants and forbidden participation states", async () => {
    dbMocks.realtimeRepository.findByTokenHash.mockResolvedValueOnce(null);
    await expect(validateLiveToken("missing")).resolves.toMatchObject({
      valid: false,
      reason: "INVALID_TOKEN",
    });

    dbMocks.realtimeRepository.findByTokenHash.mockResolvedValueOnce({
      id: "connection-1",
      participationId: "participation-1",
      connectionId: "connection-id",
      state: "pending",
      tokenHash: "live-token-hash",
      tokenExpiresAt: new Date(Date.now() + 60_000),
      connectedAt: new Date(),
      disconnectedAt: null,
      participation: {
        id: "participation-1",
        partyId: "party-1",
        userId: "user-1",
        role: "PLAYER",
        status: "BANNED",
      },
    });
    dbMocks.participationRepository.findParticipationById.mockResolvedValueOnce({
      id: "participation-1",
      partyId: "party-1",
      userId: "user-1",
      role: "PLAYER",
      status: "BANNED",
      paymentState: "PAID",
      admissionState: "ADMITTED",
    });
    await expect(validateLiveToken("live-token")).resolves.toMatchObject({
      valid: false,
      reason: "PARTICIPATION_INACTIVE",
    });
  });

  it("rejects unpaid player tokens", async () => {
    dbMocks.realtimeRepository.findByTokenHash.mockResolvedValueOnce({
      id: "connection-1",
      participationId: "participation-1",
      connectionId: "connection-id",
      state: "pending",
      tokenHash: "live-token-hash",
      tokenExpiresAt: new Date(Date.now() + 60_000),
      connectedAt: new Date(),
      disconnectedAt: null,
      participation: {
        id: "participation-1",
        partyId: "party-1",
        userId: "user-1",
        role: "PLAYER",
        status: "READY",
      },
    });
    dbMocks.participationRepository.findParticipationById.mockResolvedValueOnce({
      id: "participation-1",
      partyId: "party-1",
      userId: "user-1",
      role: "PLAYER",
      status: "READY",
      paymentState: "NONE",
      admissionState: "PENDING",
    });

    await expect(validateLiveToken("live-token")).resolves.toMatchObject({
      valid: false,
      reason: "PAYMENT_REQUIRED",
    });
  });
});

describe("live room state and commands", () => {
  it("applies fresh movement inputs and rejects stale sequences", () => {
    const state = makeState();
    const client = makeClient("session-1");
    const player = addLivePlayer(state, client);
    const startX = player.x;

    expect(dispatchCommand(state, client, {
      type: "room:move",
      payload: { sequence: 1, x: 1, y: 0 },
    })).toMatchObject({ accepted: true, acknowledge: false });
    applyMovementTick(state, 50);
    expect(player.x).toBeGreaterThan(startX);
    expect(player.lastProcessedInputSequence).toBe(1);
    expect(player.facing).toBe("right");

    expect(dispatchCommand(state, client, {
      type: "room:move",
      payload: { sequence: 1, x: -1, y: 0 },
    })).toMatchObject({ accepted: false, error: "STALE_MOVEMENT_INPUT" });
  });

  it("rejects malformed movement vectors", () => {
    const state = makeState();
    const client = makeClient("session-1");
    addLivePlayer(state, client);

    expect(dispatchCommand(state, client, {
      type: "room:move",
      payload: { sequence: 1, x: 4, y: 0 },
    })).toMatchObject({ accepted: false, error: "INVALID_MOVEMENT_INPUT" });
  });

  it("keeps one active state entry for concurrent double connection", () => {
    const state = makeState();
    const firstClient = makeClient("session-1");
    const secondClient = makeClient("session-2");
    const auth = {
      participationId: "participation-1",
      partyId: "party-1",
      userId: "user-1",
      role: "player",
      connectionToken: "live-token",
    };

    addPlayer(state, firstClient, auth);
    addPlayer(state, secondClient, auth);

    expect(state.players.size).toBe(1);
    expect(state.players.has("session-1")).toBe(false);
    expect(state.players.has("session-2")).toBe(true);
    expect(state.connectedCount).toBe(1);
  });

  it("does not leak private player fields through the synchronized schema view", () => {
    const state = makeState();
    addLivePlayer(state, makeClient("session-1"));

    const encoded = new Encoder(state).encodeAll();
    const payload = Buffer.from(encoded).toString("utf8");

    expect(payload).not.toContain("session-1-user");
    expect(payload).not.toContain("session-1-participation");
    expect(payload).not.toContain("player");
  });

  it("rejects player commands outside valid phase and rejects observer role commands", () => {
    const state = makeState();
    const playerClient = makeClient("session-1");
    addLivePlayer(state, playerClient);
    state.currentRoundStatus = "waiting";

    expect(dispatchCommand(state, playerClient, { type: "round:submit", payload: {} })).toMatchObject({
      accepted: false,
      error: "ROUND_NOT_ACTIVE",
    });

    const observerClient = makeClient("session-2");
    addLivePlayer(state, observerClient, "readObserver");
    state.currentRoundStatus = "active";
    expect(dispatchCommand(state, observerClient, { type: "round:submit", payload: {} })).toMatchObject({
      accepted: false,
      error: "ROLE_NOT_ALLOWED",
    });
  });

  it("rejects paused and late player inputs with stable reasons", () => {
    const state = makeState();
    const playerClient = makeClient("session-1");
    addLivePlayer(state, playerClient);

    state.currentRoundStatus = "paused";
    expect(dispatchCommand(state, playerClient, { type: "round:submit", payload: { answer: "a" } })).toMatchObject({
      accepted: false,
      error: "ROUND_PAUSED",
    });

    state.currentRoundStatus = "verification";
    expect(dispatchCommand(state, playerClient, { type: "round:submit", payload: { answer: "b" } })).toMatchObject({
      accepted: false,
      error: "LATE_INPUT",
    });
  });

  it("marks a player finished during active round and rejects no-shows", () => {
    const state = makeState();
    const playerClient = makeClient("session-1");
    const player = addLivePlayer(state, playerClient);
    player.status = "playing";

    expect(dispatchCommand(state, playerClient, { type: "round:finish", payload: { actionNonce: "nonce-1" } })).toMatchObject({
      accepted: true,
    });
    expect(player.status).toBe("finished_round");

    const noShowClient = makeClient("session-2");
    const noShow = addLivePlayer(state, noShowClient);
    noShow.status = "pending";

    expect(dispatchCommand(state, noShowClient, { type: "round:submit", payload: {} })).toMatchObject({
      accepted: false,
      error: "ROUND_PARTICIPANT_NOT_ADMITTED",
    });
  });

  it("rejects inputs while disconnected and accepts fresh input after reconnect", () => {
    const state = makeState();
    const client = makeClient("session-1");
    const player = addLivePlayer(state, client);
    player.status = "playing";

    expect(dispatchCommand(state, client, { type: "round:submit", payload: { actionNonce: "nonce-a", answer: "a" } })).toMatchObject({
      accepted: true,
    });

    markDisconnected(state, client);
    expect(dispatchCommand(state, client, { type: "round:submit", payload: { actionNonce: "nonce-a", answer: "a" } })).toMatchObject({
      accepted: false,
      error: "PLAYER_DISCONNECTED",
    });

    markReconnected(state, client);
    expect(dispatchCommand(state, client, { type: "round:submit", payload: { actionNonce: "nonce-b", answer: "b" } })).toMatchObject({
      accepted: true,
    });
    expect(state.connectedCount).toBe(1);
  });

  it("rejects active inputs from connected players who were not admitted into the round", () => {
    const state = makeState();
    const client = makeClient("session-1");
    addLivePlayer(state, client);

    expect(dispatchCommand(state, client, { type: "round:submit", payload: { actionNonce: "nonce-a" } })).toMatchObject({
      accepted: false,
      error: "ROUND_PARTICIPANT_NOT_ADMITTED",
    });
  });

  it("requires an action nonce for admitted active inputs", () => {
    const state = makeState();
    const client = makeClient("session-1");
    const player = addLivePlayer(state, client);
    player.status = "playing";

    expect(dispatchCommand(state, client, { type: "round:submit", payload: { answer: "a" } })).toMatchObject({
      accepted: false,
      error: "ACTION_NONCE_REQUIRED",
    });
  });

  it("filters readonly snapshots and protects admin snapshots by role", () => {
    const state = makeState();
    const playerClient = makeClient("session-1");
    addLivePlayer(state, playerClient);
    const observerClient = makeClient("session-2");
    addLivePlayer(state, observerClient, "readObserver");

    const readonlySnapshot = getReadonlySnapshot(state);
    expect(readonlySnapshot).toMatchObject({
      partyId: "party-1",
      connectedCount: 2,
      playerCount: 2,
    });
    expect(Object.hasOwn(readonlySnapshot, "players")).toBe(false);
    expect(Object.hasOwn(readonlySnapshot, "userId")).toBe(false);
    expect(Object.hasOwn(readonlySnapshot, "payload")).toBe(false);
    expect(Object.hasOwn(readonlySnapshot, "answer")).toBe(false);

    const adminSnapshot = getAdminSnapshot(state);
    expect(adminSnapshot.players[0]).toHaveProperty("userId");
    expect(dispatchCommand(state, observerClient, { type: "snapshot:request", payload: { audience: "admin" } })).toMatchObject({
      accepted: false,
      error: "ROLE_NOT_ALLOWED",
    });
    expect(dispatchCommand(state, observerClient, { type: "snapshot:request", payload: { audience: "observer" } })).toMatchObject({
      accepted: true,
    });
    expect(dispatchCommand(state, observerClient, { type: "snapshot:request", payload: {} })).toMatchObject({
      accepted: false,
      error: "ROLE_NOT_ALLOWED",
    });
  });
});
