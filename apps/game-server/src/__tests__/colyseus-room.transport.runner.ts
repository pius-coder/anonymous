/**
 * L4 transport runner — executed outside Vitest (tinypool IPC conflicts with Colyseus).
 * Invoked by `pnpm test` after the vitest unit suite.
 *
 * Uses `@colyseus/testing` for join / reconnect / no-leak / desync.
 * Requires Node --experimental-test-module-mocks (wired in package.json).
 */
import { mock } from "node:test";
import { Encoder } from "@colyseus/schema";

process.env.NODE_ENV = "test";
process.env.RECONNECT_TIMEOUT_MS = "5000";
process.env.MAX_CLIENTS_PER_ROOM = "4";

const tokenPayload = {
  id: "connection-1",
  participationId: "participation-live",
  connectionId: "cid-1",
  state: "pending",
  tokenHash: "hash",
  tokenExpiresAt: new Date(Date.now() + 60_000),
  connectedAt: new Date(),
  disconnectedAt: null,
  participation: {
    id: "participation-live",
    partyId: "party-live",
    userId: "user-live",
    role: "PLAYER",
    status: "PLAYING",
  },
};

mock.module("@session-jeu/db", {
  namedExports: {
    realtimeRepository: {
      findByTokenHash: async () => tokenPayload,
      markReconnectingByParticipation: async () => ({}),
      markConnectedByParticipation: async () => ({}),
      markDisconnectedByParticipation: async () => ({}),
    },
    partyRepository: {
      findPartyById: async () => ({ id: "party-live", status: "ROUND_ACTIVE" }),
      updatePartyStatus: async () => ({}),
    },
    roundRepository: {
      listRoundsByParty: async () => [
        { id: "round-live", number: 1, status: "ACTIVE", deadline: null },
      ],
      findRoundDeadlineByRoundId: async () => ({
        deadlineAt: new Date(Date.now() + 120_000),
      }),
      findPlayerActionByNonce: async () => null,
      createPlayerAction: async () => ({ id: "a1" }),
      claimDueRoundDeadline: async () => false,
      updateRoundLifecycle: async () => ({}),
      listRoundParticipants: async () => [],
      markRoundParticipantsWaitingReview: async () => ({ count: 0 }),
    },
    participationRepository: {
      updateParticipationStatus: async () => ({}),
    },
  },
});

const { boot } = await import("@colyseus/testing");
const { createGameServer } = await import("../create-server.js");
const { config } = await import("../config.js");
type GameRoom = import("../rooms/GameRoom.js").GameRoom;
type LiveRoomState = import("../rooms/schema/LiveRoomState.js").LiveRoomState;
type ColyseusTestServer = import("@colyseus/testing").ColyseusTestServer;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function run(): Promise<void> {
  const server = createGameServer({ presence: "none" });
  let colyseus: ColyseusTestServer | undefined;

  try {
    colyseus = await boot(server);

    // AC: server policy ignores client options
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
        reconnectTimeout: 999_999,
        maxClients: 1,
        currentRoundStatus: "closed",
        currentRoundId: "client-forged-round",
        roundDeadlineAt: 1,
      })) as GameRoom;

      assert(room.maxClients === config.maxClientsPerRoom, "maxClients from server config");
      assert(room.maxClients === 4, "maxClients env applied");
      // @ts-expect-error private for assertion
      assert(room.reconnectTimeoutMs === config.reconnectTimeoutMs, "reconnect from config");
      const roundId = String(room.state.currentRoundId);
      const roundStatus = String(room.state.currentRoundStatus);
      assert(roundId === "round-live", "round id from DB");
      assert(roundStatus === "active", "round status from DB");
      assert(roundId !== "client-forged-round", "client round ignored");
      assert(roundStatus !== "closed", "client status ignored");
      console.log("ok: server policy ignores client options");
      await colyseus.cleanup();
    }

    // join + server-hydrated round + audience snapshot builders
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
      })) as GameRoom;

      // Register waiters BEFORE connect so join-time messages are not missed.
      const connectedWait = new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("player:connected timeout")), 8_000);
        // attach after connectTo returns is too late; use server-side assertion instead.
        void timer;
        resolve({});
      });
      void connectedWait;

      const client = await colyseus.connectTo(room, {
        partyId: "party-live",
        connectionToken: "live-token-plain",
      });

      assert(!!client.sessionId, "sessionId assigned");
      assert(room.state.players.size === 1, "one player in room");
      assert(room.state.currentRoundId === "round-live", "server-hydrated round");
      assert(room.state.currentRoundStatus === "active", "server-hydrated status");
      // @ts-expect-error private for assertion
      assert(room.reconnectTimeoutMs === 5000, "server reconnect policy");
      assert(room.maxClients === 4, "server maxClients policy");

      const player = room.state.players.get(client.sessionId);
      assert(player?.role === "player", "player role on state");
      assert(player?.participationId === "participation-live", "participation bound");
      assert(player?.connected === true, "player connected");

      // Audience snapshot is consumable (builder shape) without private competitive fields.
      const { getPlayerSnapshotForClient, getAdminSnapshot, getReadonlySnapshot } =
        await import("../handlers/readonly-handler.js");
      const playerSnap = getPlayerSnapshotForClient(room.state, {
        sessionId: client.sessionId,
      } as never);
      assert(playerSnap?.id === "participation-live", "player snapshot id");
      assert(Object.hasOwn(playerSnap ?? {}, "answer") === false, "no answer on player snap");
      const adminSnap = getAdminSnapshot(room.state);
      assert(Array.isArray(adminSnap.players), "admin has players");
      const ro = getReadonlySnapshot(room.state);
      assert(Object.hasOwn(ro, "players") === false, "readonly has no players list");
      console.log("ok: join + audience snapshots");
      await colyseus.cleanup();
    }

    // reconnect within window
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
      })) as GameRoom;

      // SDK requires room min uptime (~5s) before automatic reconnection is allowed.
      await new Promise((r) => setTimeout(r, 5_200));

      const client = await colyseus.connectTo(room, {
        partyId: "party-live",
        connectionToken: "live-token-plain",
      });

      const reconnectionToken = client.reconnectionToken;
      assert(!!reconnectionToken, "reconnectionToken present");

      await client.leave(false);
      await new Promise((r) => setTimeout(r, 120));

      const disconnected = Array.from(room.state.players.values()).find(
        (p) => p.participationId === "participation-live",
      );
      assert(disconnected?.connected === false, "marked disconnected during window");

      // SDK 0.17: reconnect(reconnectionToken) only.
      const reconnected = await colyseus.sdk.reconnect(reconnectionToken!);
      assert(!!reconnected.sessionId, "reconnected session");

      // Allow onLeave allowReconnection path to complete.
      await new Promise((r) => setTimeout(r, 200));

      const after = Array.from(room.state.players.values()).find(
        (p) => p.participationId === "participation-live",
      );
      assert(after?.connected === true, "reconnected player connected");
      assert(room.state.players.size === 1, "no leak after reconnect");
      console.log("ok: reconnect within window");
      await colyseus.cleanup();
    }

    // no private field leak on schema wire
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
      })) as GameRoom;

      await colyseus.connectTo(room, {
        partyId: "party-live",
        connectionToken: "live-token-plain",
      });

      const encoded = new Encoder(room.state as LiveRoomState).encodeAll();
      const payload = Buffer.from(encoded).toString("utf8");
      assert(!payload.includes("user-live"), "userId not on wire");
      assert(!payload.includes("participation-live"), "participationId not on wire");
      console.log("ok: no private field leak on schema");
      await colyseus.cleanup();
    }

    // stale movement sequence over transport
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
      })) as GameRoom;

      const client = await colyseus.connectTo(room, {
        partyId: "party-live",
        connectionToken: "live-token-plain",
      });

      client.send("room:move", { sequence: 1, x: 1, y: 0 });
      await room.waitForNextSimulationTick();
      await room.waitForNextSimulationTick();

      const rejectedWait = client.waitForMessage("command:rejected", 5_000);
      client.send("room:move", { sequence: 1, x: -1, y: 0 });
      const rejected = await rejectedWait;
      assert(rejected.type === "room:move", "reject type");
      assert(rejected.error === "STALE_MOVEMENT_INPUT", "stale sequence rejected");
      console.log("ok: stale movement rejected (desync protection)");
      await colyseus.cleanup();
    }

    // join without token refused
    {
      const room = (await colyseus.createRoom("game_room", {
        partyId: "party-live",
      })) as GameRoom;

      let failed = false;
      try {
        await colyseus.connectTo(room, { partyId: "party-live" });
      } catch {
        failed = true;
      }
      assert(failed, "join without token must fail");
      assert(room.state.players.size === 0, "no player after rejected join");
      console.log("ok: join without token refused");
      await colyseus.cleanup();
    }

    console.log("\nL4 @colyseus/testing: all transport checks passed");
  } finally {
    await colyseus?.shutdown();
  }
}

run().catch((err) => {
  console.error("L4 transport runner failed:", err);
  process.exit(1);
});
