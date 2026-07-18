# Step 01: Analyze

**Task:** P-A-REALTIME - Live autoritaire, persistence et reconnexion
**Started:** 2026-07-18T01:21:50Z

---

## Context Discovery

### Session Context

- Worktree session verified in `/home/afreeserv/worktrees/anonymous/p-a-realtime` on branch `apex/p-a-realtime` at base commit `ea703ab`.
- Root package scripts expose the expected L1/L3-L5 gates: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (`package.json`).
- Scoped workspaces involved by ownership:
  - `apps/game-server/package.json`
  - `apps/worker/package.json`
  - `apps/web/package.json`

### Local Documentation Read

- `docs/README.md`
- `docs/05-workflows/agent-worktree-convention.md`
- `docs/06-roadmap/apex-production-execution-plan.md`
- `docs/06-roadmap/apex-tasks/production/wave-a/P-A-REALTIME-authoritative-live.md`
- `docs/03-architecture/realtime-and-streaming.md`
- `docs/03-architecture/uml/realtime-flow.md`
- `docs/03-architecture/uml/permissions.md`
- `docs/03-architecture/security-model.md`
- `docs/04-layers/realtime.md`
- `docs/05-workflows/test-strategy.md`
- `docs/05-workflows/test-commands.md`
- `docs/00-audit/head-forensic-audit.md` (realtime/domain architecture section)
- `docs/00-audit/production-readiness-gap-analysis.md`

### Context7

- Colyseus library ID: `/colyseus/docs`
- Redis library ID: `/redis/docs`

Context7 findings used for this lot:

- Colyseus docs confirm the relevant hooks and scaling primitives already targeted by the lot:
  - `onAuth` is the supported server-side admission hook.
  - `allowReconnection()` / `onReconnect()` are the reconnect lifecycle primitives.
  - `@colyseus/testing` is the intended transport test harness for real join/reconnect/message assertions.
  - multi-instance scaling requires shared Redis-backed Presence and Driver.
- Redis docs confirm production patterns we need around shared long-lived clients / pools, startup `PING`-style readiness checks, and operational instrumentation for connection and command failures.

### Existing Realtime Admission Path

- Live access token issuance already exists in the API use case:
  - short-lived opaque token TTL is hardcoded to 60s in [apps/api/src/use-cases/live/live-access.use-case.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:6).
  - party status gating exists in the same file at [lines 7-15](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:7) and [64-66](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:64).
  - participation existence/status gating exists at [68-76](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:68).
  - persisted token storage uses only `tokenHash`, not the raw token, via `realtimeRepository.upsertConnection(...)` at [83-89](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:83).
- The Connect RPC surface already mounts `CreateLiveAccess` and only that method today:
  - [apps/api/src/rpc/realtime-service.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/rpc/realtime-service.ts:29).
- Current endpoint resolution is not fail-fast in local/dev:
  - `GAME_WS_URL` falls back to `LIVE_SERVER_URL`, then to `ws://localhost:3002` in [apps/api/src/use-cases/live/live-access.use-case.ts:45](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:45).
  - this matches the production audit warning about silent localhost fallback in [docs/00-audit/production-readiness-gap-analysis.md](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/00-audit/production-readiness-gap-analysis.md:158).

### Existing Game Server Runtime

- `GameRoom` already enforces some authoritative server policy:
  - client-provided reconnect/maxClients/round fields are documented as ignored in [apps/game-server/src/rooms/GameRoom.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:36).
  - room policy is loaded from `config` and round snapshot from DB in [61-82](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:61).
  - `onAuth` validates `connectionToken` and party match in [129-151](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:129).
  - `onJoin` immediately sends role-specific snapshots in [153-176](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:153).
  - `onLeave` already uses `allowReconnection()` and restores snapshots after reconnect in [179-205](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:179).
- The current server boot is minimal:
  - `createGameServer()` only wires `RedisPresence` optionally; no shared Driver, transport limits, or origin policy yet in [apps/game-server/src/create-server.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/create-server.ts:9).
  - `src/index.ts` only calls `listen()` and logs the port; no readiness/drain/shutdown handling in [apps/game-server/src/index.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/index.ts:6).
- Current live config is partial:
  - strict envs require `REDIS_URL`, but local still falls back to localhost in [apps/game-server/src/config.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/config.ts:11).
  - there are no origin / message-size / quota / frequency settings in this config file.

### Existing Persistence and Reconnect Behavior

- DB-backed live token lookup is already in `validateLiveToken()` with participation status checks in [apps/game-server/src/auth/live-auth.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/auth/live-auth.ts:11).
- Player connection lifecycle helpers exist but currently swallow persistence errors:
  - `persistReconnecting()` catches and ignores DB failures at [81-84](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/connection-handler.ts:81).
  - `persistConnected()` catches and ignores DB failures at [86-89](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/connection-handler.ts:86).
  - `persistDisconnect()` catches and ignores DB failures at [95-98](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/connection-handler.ts:95).
- The `RealtimeConnection` repository already supports upsert/find/update state operations:
  - [packages/db/src/repositories/realtime.repository.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/packages/db/src/repositories/realtime.repository.ts:4).
- Round input persistence already exists with DB-backed idempotence-by-nonce:
  - synchronous validation and late/deadline checks in [apps/game-server/src/handlers/round-handler.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/round-handler.ts:41).
  - DB lookup before create at [125-132](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/round-handler.ts:125).
  - duplicate handling on unique-race retry at [144-155](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/round-handler.ts:144).
- One important behavior gap remains in the room deadline path:
  - `closeRoundAtDeadline()` still catches downstream persistence errors and keeps moving at [246-261](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:246), which conflicts with the lot requirement that DB/Redis failures never become silent success.

### Existing Projection / No-Leak Surface

- Role gating for snapshots exists in the room and readonly handler:
  - role-based `sendAudienceSnapshot()` in [apps/game-server/src/rooms/GameRoom.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:213).
  - explicit `snapshot:request` RBAC in [apps/game-server/src/handlers/readonly-handler.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/readonly-handler.ts:85).
- Current projection shape is still too broad for production:
  - player snapshot includes `userId` and `role` in [43-49](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/readonly-handler.ts:43).
  - admin snapshot includes per-player `userId` and `role` in [52-70](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/readonly-handler.ts:52).
- The Colyseus schema deliberately omits several private fields from wire serialization:
  - `sessionId`, `userId`, `participationId`, `role`, `previousStatus`, `pendingInput` are not decorated in [apps/game-server/src/rooms/schema/LiveRoomState.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/schema/LiveRoomState.ts:3).
  - only public movement/state fields are decorated there.
- Contract-level audience protection already exists in `packages/contracts`:
  - forbidden fields per audience live in [packages/contracts/src/audience.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/packages/contracts/src/audience.ts:7).
  - no-leak tests already exist in [packages/contracts/src/__tests__/audience.test.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/packages/contracts/src/__tests__/audience.test.ts:69).

### Existing Web Live Client

- The live web facade already restricts join options to `{ partyId, connectionToken }` in [apps/web/src/components/game/live-room-facade.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/src/components/game/live-room-facade.ts:22).
- The Phaser room still contains a local preview fallback:
  - on access failure it mounts preview players and reports `"preview"` in [apps/web/src/components/game/phaser/createRoomGame.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/src/components/game/phaser/createRoomGame.ts:223).
  - on join failure after access grant it still mounts preview players in [260-264](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/src/components/game/phaser/createRoomGame.ts:260).
- The current browser E2E suite explicitly treats preview mode as acceptable:
  - [apps/web/e2e/room.spec.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/e2e/room.spec.ts:4).
- The current L5 live smoke only proves raw WebSocket reachability, not authenticated room join/reconnect:
  - [apps/web/e2e/live-smoke.spec.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/e2e/live-smoke.spec.ts:21).

### Existing Transport / Worker Validation Patterns

- The game-server already has an L4 transport runner using `@colyseus/testing`:
  - [apps/game-server/src/__tests__/colyseus-room.transport.runner.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/__tests__/colyseus-room.transport.runner.ts:1).
  - it covers join, reconnect, no-leak on the schema payload, stale movement rejection, and missing-token refusal.
- Worker-side deadline closure already has the intended ownership split and atomic claim semantics:
  - [apps/worker/src/jobs/roundDeadline.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/jobs/roundDeadline.ts:11).
- The worker runner already shows the pattern we can mirror for game-server lifecycle:
  - start waits for readiness in [apps/worker/src/runner.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/runner.ts:121).
  - stop drains workers/queues in [139-160](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/runner.ts:139).
  - SIGINT/SIGTERM hooks are installed in [162-172](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/runner.ts:162).
- Current metrics infra is still in-process only:
  - [apps/worker/src/metrics.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/metrics.ts:1).

### Production Gaps Explicitly Confirmed by Docs

- `docs/00-audit/production-readiness-gap-analysis.md` already calls out:
  - missing Origin policy / live quotas at [127-132](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/00-audit/production-readiness-gap-analysis.md:127).
  - missing readiness and graceful shutdown at [176-181](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/00-audit/production-readiness-gap-analysis.md:176).
  - dangerous localhost fallback for live endpoint at [158-160](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/00-audit/production-readiness-gap-analysis.md:158).
- `docs/03-architecture/security-model.md` requires:
  - short-lived live tokens stored only as hashes at [docs/03-architecture/security-model.md](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/03-architecture/security-model.md:6).
  - audience-filtered live events and explicit observer permissions at [8-10](/home/afreeserv/worktrees/anonymous/p-a-realtime/docs/03-architecture/security-model.md:8).
- `docs/04-layers/realtime.md` confirms the layer boundary:
  - realtime owns connection lifecycle, reconnect, audience views, and no-leak validation.

### Summary of What Exists

- Authoritative server policy is partially implemented already for room boot, token auth, reconnect window, DB-backed round hydration, command nonce persistence, and basic audience snapshots.
- The major missing production surfaces are also concrete in the current codebase:
  - no multi-instance shared Driver / room ownership logic;
  - no fail-fast startup/readiness/drain for the game-server;
  - no Redis `noeviction` guard or live Redis health checks;
  - no origin / frequency / payload / quota enforcement;
  - swallowed persistence errors in connection and deadline paths;
  - web preview fallback still present on a production-owned live route;
  - transport and E2E tests do not yet prove the full acceptance matrix for revoked token, unpaid participant, forbidden origin, crash recovery, and multi-instance coherence.
