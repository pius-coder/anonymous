# Step 02: Plan

**Task:** P-A-REALTIME - Live autoritaire, persistence et reconnexion
**Started:** 2026-07-18T01:21:50Z

---

## Planning Progress

## Implementation Plan: P-A-REALTIME - Live autoritaire, persistence et reconnexion

### Overview

Harden the existing live path rather than replacing it: keep the current Connect `CreateLiveAccess` plus Colyseus room flow, but make admission stricter, remove silent fallbacks, add shared Redis-backed multi-instance coordination, fail-fast boot/readiness guards, durable reconnect state transitions, per-audience projection redaction, and transport/browser proofs that exercise the real path end to end.

### Prerequisites

- Reuse only public repository APIs already exported by `@session-jeu/db`; do not add contracts or DB schema changes.
- Keep the current room name / transport surface stable where possible (`game_room`, `connectionToken`, existing message families), then harden behavior behind them.
- Use Context7-backed Colyseus guidance for Presence + Driver + reconnect lifecycle, and Redis startup/health checks.

---

### File Changes

#### `apps/api/src/use-cases/live/live-access.use-case.ts`

Reference: current token issuance and fallback endpoint resolution at [lines 6-96](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/use-cases/live/live-access.use-case.ts:6).

- Tighten admission checks before issuing a token:
  - require a participation role that is actually eligible for the requested live audience;
  - require a paid/admitted participation state for player joins, while allowing readonly/admin roles through their documented paths;
  - require a live-compatible round/party state instead of only broad party status checks.
- Replace permissive endpoint fallback (`LIVE_SERVER_URL` / localhost) with a single authoritative `GAME_WS_URL` resolution policy and actionable failure codes.
- Keep raw token generation/hashing, but make token issuance explicitly single-current-token-per-participation by leaning on the existing `upsertConnection()` overwrite behavior.
- Return richer, stable denial reasons/messages so unpaid participant, revoked token precursor state, and room-not-live conditions surface cleanly to client/tests.

#### `apps/api/src/rpc/realtime-service.ts`

Reference: current Connect wrapper at [lines 29-44](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/api/src/rpc/realtime-service.ts:29).

- Preserve transport shape, but ensure new `LiveAccessUseCaseError` codes map to actionable Connect errors without collapsing everything into generic internal failures.
- Keep `CreateLiveAccess` as the public API entrypoint; do not add new contract methods.

#### `apps/game-server/package.json`

Reference: current dependencies only wire `colyseus`, `ioredis`, `@colyseus/testing` in [apps/game-server/package.json](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/package.json:1).

- Add the shared Colyseus Redis driver package needed for multi-instance room ownership coordination if the current runtime lacks it.
- Keep test scripts stable, but allow an additional targeted runtime command if needed for a multi-instance transport proof.

#### `apps/game-server/src/config.ts`

Reference: current config only exposes port, `REDIS_URL`, reconnect timeout, max clients, and local-vs-redis presence at [lines 1-35](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/config.ts:1).

- Introduce fail-fast live server policy settings for:
  - allowed origins;
  - per-message payload size;
  - message frequency / quota windows;
  - reconnect timeout;
  - Redis readiness timeout;
  - optional requirement that Redis run with `maxmemory-policy noeviction`.
- Preserve the current authoritative reconnect/max-client policy, but move all production-critical defaults behind explicit envs where silent localhost behavior is unsafe.

#### `apps/game-server/src/create-server.ts`

Reference: current server builder only applies optional `RedisPresence` and defines `game_room` with `filterBy(["partyId"])` at [lines 1-15](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/create-server.ts:1).

- Upgrade the shared runtime wiring to use both Redis Presence and shared Driver when Redis mode is active, so room creation/lookup/capacity/ownership work coherently across instances.
- Configure transport-level limits that Colyseus supports at server boot: origin checks, payload limits, and other boot-time fail-fast settings exposed by `config.ts`.
- Keep the current room definition name and `filterBy(["partyId"])` behavior.

#### `apps/game-server/src/index.ts`

Reference: current entrypoint only boots the server and logs the port at [lines 1-12](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/index.ts:1).

- Wrap the game-server in an explicit runtime lifecycle:
  - startup readiness (Redis probe + Redis config guard + server listen confirmation);
  - shutdown/drain/dispose on `SIGINT`/`SIGTERM`;
  - structured boot/shutdown logging and metric snapshot output.
- Expose a minimal readiness/health signal consistent with the repo’s production-readiness audit, without modifying central mount ownership.

#### `apps/game-server/src/auth/live-auth.ts`

Reference: current token validation only checks token hash, expiry, disconnected state, and a subset of participation statuses at [lines 11-38](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/auth/live-auth.ts:11).

- Extend token validation to re-check live eligibility from public repositories at join time:
  - payment/admission state for players;
  - explicit role normalization and audience permission;
  - revoked/closed/replaced token state;
  - party/round lifecycle compatibility.
- Produce distinct reasons for revoked token, unpaid participant, inactive participation, and expired reconnect windows so transport/browser tests can assert them directly.

#### `apps/game-server/src/handlers/connection-handler.ts`

Reference: current helpers mutate in-memory state and swallow persistence errors at [lines 81-98](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/connection-handler.ts:81).

- Remove the silent `.catch(() => {})` behavior from connection persistence.
- Persist connection lifecycle transitions and matching participation connection state through existing public repository methods.
- Preserve reconnect continuity for the same participation by reusing prior position/sequence when present.
- Add server-side counters / events for join, drop, reconnect, and final disconnect.

#### `apps/game-server/src/handlers/command-dispatcher.ts`

Reference: current dispatcher only verifies handler existence, room membership, connected status, and coarse role gating at [lines 1-39](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/command-dispatcher.ts:1).

- Add common pre-dispatch quotas/frequency/payload validation shared by movement, round commands, and snapshot requests.
- Normalize rejection reasons into stable public codes that downstream tests can assert (`RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `ROLE_NOT_ALLOWED`, etc.).
- Feed duplicate/late/quota counters into the new game-server metrics surface.

#### `apps/game-server/src/handlers/round-handler.ts`

Reference: current path already validates before persistence and handles nonce idempotence at [lines 41-182](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/round-handler.ts:41).

- Keep the current validate → persist → apply ordering.
- Extend the rejection surface so late, duplicate, not-admitted, and persistence-failed cases become observable metrics/log categories.
- Reuse DB-backed idempotence, but ensure memory-side replay protection survives reconnect and process restart via repo re-checks rather than only the in-memory nonce set.
- Preserve the current “no effect twice” rule for accepted duplicate nonces.

#### `apps/game-server/src/handlers/readonly-handler.ts`

Reference: current player/admin/readonly snapshots are built inline at [lines 7-120](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/handlers/readonly-handler.ts:7).

- Split projections into distinct allowlisted builders for:
  - player;
  - admin;
  - observer;
  - support.
- Redact identifiers/fields more aggressively on the wire:
  - observer/support must not receive admin-only identifiers or private competitive state;
  - player projection must contain only the self view intended for the user;
  - admin may keep operational identity fields where justified.
- Keep `snapshot:request` RBAC centralized here, with explicit support-role behavior rather than treating support as generic readonly.

#### `apps/game-server/src/rooms/schema/LiveRoomState.ts`

Reference: current schema already avoids decorating private identifiers at [lines 3-29](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/schema/LiveRoomState.ts:3).

- Preserve the existing server-only/private field approach.
- Add only the minimum extra non-synchronized server-side fields needed for quotas/metrics/reconnect bookkeeping if those cannot live on `client.userData`.
- Do not decorate any new sensitive fields into the synced schema.

#### `apps/game-server/src/rooms/GameRoom.ts`

Reference: current room flow spans authoritative boot, auth, join, reconnect, snapshots, and deadline closure at [lines 61-271](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/rooms/GameRoom.ts:61).

- Keep the authoritative room boot pattern, but harden each stage:
  - boot from DB snapshot only;
  - join only with validated current token;
  - reconnect only within configured server window;
  - reject commands before persistence with stable errors;
  - reject room participation cleanly when Redis/DB persistence cannot complete.
- Replace silent persistence fallthroughs in deadline closure and disconnect paths with explicit failure behavior/logging.
- Add multi-instance-safe runtime signals:
  - room ownership metadata / boot logs;
  - join capacity consistency;
  - reconnect bookkeeping that does not duplicate participants after drops/crashes.
- Emit role-specific snapshots/messages from the new projection helpers rather than inline ad hoc payloads.

#### `apps/game-server/src/__tests__/live-room.integration.test.ts`

Reference: existing direct handler/integration assertions already cover observer rejection and reconnect basics in [apps/game-server/src/__tests__/live-room.integration.test.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/__tests__/live-room.integration.test.ts:204).

- Extend low-level coverage for:
  - unpaid / not-admitted / revoked token denial paths;
  - per-audience snapshot redaction;
  - actionable rejection reasons;
  - failure propagation when persistence/update calls fail.

#### `apps/game-server/src/__tests__/round-input-persistence.test.ts`

Reference: existing tests already cover nonce persistence/idempotence in [apps/game-server/src/__tests__/round-input-persistence.test.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/__tests__/round-input-persistence.test.ts:1).

- Add coverage for process-restart-safe duplicate detection and for surfacing persistence failures rather than silently accepting them.

#### `apps/game-server/src/__tests__/colyseus-room.transport.runner.ts`

Reference: current L4 runner already proves join/reconnect/no-leak/stale-sequence at [lines 1-261](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/game-server/src/__tests__/colyseus-room.transport.runner.ts:1).

- Extend the real transport proof with the production acceptance cases owned by this lot:
  - revoked/missing token refusal;
  - unpaid participant refusal;
  - forbidden origin refusal;
  - late command refusal;
  - no-leak assertions on raw snapshots/messages, not just schema patches;
  - reconnect after disconnect without double effect;
  - optional two-server same-Redis coherence proof when integration env provides Redis.

#### `apps/worker/src/jobs/roundDeadline.ts`

Reference: worker deadline close already uses atomic claim and durable updates in [apps/worker/src/jobs/roundDeadline.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/worker/src/jobs/roundDeadline.ts:1).

- Align runtime error handling and observability names with the hardened game-server deadline close path so both surfaces report consistent failure semantics.
- Keep ownership boundaries intact: no central runner changes, only deadline job behavior/telemetry if needed.

#### `apps/web/src/components/game/live-room-facade.ts`

Reference: current facade still returns `previewAllowed: true` on access failure in [apps/web/src/components/game/live-room-facade.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/src/components/game/live-room-facade.ts:17).

- Remove production-path preview signaling from the owned live facade.
- Preserve the minimal join option surface (`partyId`, `connectionToken`) and make denial/offline states explicit for the room UI.

#### `apps/web/src/components/game/phaser/createRoomGame.ts`

Reference: current room scene mounts preview players on access failure or join failure at [223-295](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/src/components/game/phaser/createRoomGame.ts:223).

- Replace implicit preview fallback with explicit connection-denied / offline / reconnecting handling.
- Keep existing Colyseus join wiring, `onDrop`, and `onReconnect` hooks, but ensure UI state transitions reflect authoritative failure reasons instead of silently switching modes.
- Avoid changing the overall scene ownership or Phaser shell beyond the live-connection path.

#### `apps/web/e2e/live-smoke.spec.ts`

Reference: current L5 smoke only proves raw WebSocket open at [lines 21-57](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/e2e/live-smoke.spec.ts:21).

- Upgrade the browser proof to exercise a true authenticated live flow where feasible from existing UI:
  - authenticated user obtains live access;
  - room join succeeds against Colyseus;
  - reconnect/drop handling surfaces correctly;
  - failure cases do not degrade into preview mode.

#### `apps/web/e2e/room.spec.ts`

Reference: current suite explicitly accepts preview mode in [apps/web/e2e/room.spec.ts](/home/afreeserv/worktrees/anonymous/p-a-realtime/apps/web/e2e/room.spec.ts:4).

- Re-scope this spec away from “preview is acceptable on `/room`” and toward the explicit fallback policy required by this lot:
  - either assert actionable offline/denied states on the production route,
  - or confine preview-only checks to a non-production/dev-only path if one already exists.

#### `apps/game-server/src/metrics.ts` (NEW)

- Create a dedicated game-server metric collector parallel to worker metrics for:
  - joins;
  - drops;
  - reconnects;
  - late inputs;
  - duplicate inputs;
  - command rejects by reason.
- Keep it in-process for now unless an external backend already exists; the lot only needs observable counters and shutdown snapshots.

#### `apps/game-server/src/runtime/readiness.ts` (NEW)

- Centralize boot-time readiness checks:
  - Redis connectivity;
  - Redis `maxmemory-policy` / `noeviction` guard;
  - server boot state.
- Expose helpers consumed by `src/index.ts` / `src/create-server.ts` without touching central mounts.

#### `apps/game-server/src/projections/live-projections.ts` (NEW)

- Extract the audience-specific payload shaping from `readonly-handler.ts` / `GameRoom.ts` into one allowlist-oriented module.
- Make wire redaction rules explicit and testable in one place.

---

### Testing Strategy

**Update existing tests**

- `apps/game-server/src/__tests__/live-room.integration.test.ts`
  - denial cases for unpaid / revoked / not-admitted / role-forbidden joins
  - per-audience projection redaction
  - persistence failure propagation
- `apps/game-server/src/__tests__/round-input-persistence.test.ts`
  - restart-safe duplicate handling
  - late / persistence-failed metrics/reasons
- `apps/game-server/src/__tests__/colyseus-room.transport.runner.ts`
  - real client join / reconnect / duplicate / late / no-leak / forbidden origin proofs
  - optional multi-instance same-Redis proof
- `apps/web/e2e/live-smoke.spec.ts`
  - authenticated room join / reconnect / no-preview fallback
- `apps/web/e2e/room.spec.ts`
  - production route no longer silently previews when live access is unavailable

**Targeted validations**

- `scripts/worktree-run pnpm --filter @session-jeu/game-server test`
- `scripts/worktree-run pnpm --filter @session-jeu/worker test`
- `scripts/worktree-run pnpm --filter @session-jeu/web test:e2e -- live-smoke.spec.ts room.spec.ts`
- `scripts/worktree-run pnpm test:integration`
- `scripts/worktree-run pnpm typecheck`
- `scripts/worktree-run pnpm lint`

---

### Acceptance Criteria Mapping

- AC: true authenticated Colyseus client joins, acts, disconnects, reconnects without double effect
  - `apps/api/src/use-cases/live/live-access.use-case.ts`
  - `apps/game-server/src/auth/live-auth.ts`
  - `apps/game-server/src/rooms/GameRoom.ts`
  - `apps/game-server/src/handlers/connection-handler.ts`
  - `apps/game-server/src/handlers/round-handler.ts`
  - `apps/game-server/src/__tests__/colyseus-room.transport.runner.ts`
  - `apps/web/e2e/live-smoke.spec.ts`
- AC: unpaid participant, revoked token, forbidden origin, late command are refused
  - `apps/api/src/use-cases/live/live-access.use-case.ts`
  - `apps/game-server/src/config.ts`
  - `apps/game-server/src/create-server.ts`
  - `apps/game-server/src/auth/live-auth.ts`
  - `apps/game-server/src/handlers/command-dispatcher.ts`
  - `apps/game-server/src/handlers/round-handler.ts`
  - tests in `live-room.integration.test.ts` and `colyseus-room.transport.runner.ts`
- AC: DB/Redis failures never become silent success
  - `apps/game-server/src/handlers/connection-handler.ts`
  - `apps/game-server/src/rooms/GameRoom.ts`
  - `apps/worker/src/jobs/roundDeadline.ts`
  - integration tests around failure propagation
- AC: no-leak is proved on raw messages and patches
  - `apps/game-server/src/projections/live-projections.ts`
  - `apps/game-server/src/handlers/readonly-handler.ts`
  - `apps/game-server/src/rooms/schema/LiveRoomState.ts`
  - `apps/game-server/src/__tests__/colyseus-room.transport.runner.ts`
  - `apps/game-server/src/__tests__/live-room.integration.test.ts`
- AC: multiple instances keep admission/capacity/room ownership coherent
  - `apps/game-server/package.json`
  - `apps/game-server/src/config.ts`
  - `apps/game-server/src/create-server.ts`
  - `apps/game-server/src/runtime/readiness.ts`
  - `apps/game-server/src/__tests__/colyseus-room.transport.runner.ts`

---

### Risks & Considerations

- Colyseus multi-instance coherence may require a new Redis driver dependency; that is within this lot’s game-server ownership but must not spill into central mount changes.
- Some production requirements (for example broader route-level Origin/CORS policy) belong partly to later platform/security lots; this plan keeps scope to live-room boot/join/runtime enforcement and tests owned by `P-A-REALTIME`.
- Contracts and DB schema are out of scope, so all hardening must fit existing proto fields and repository APIs.
- The web preview behavior is currently depended on by `room.spec.ts`; tightening production behavior will intentionally require test rewrites.

---

## Step Complete

**Status:** ✓ Complete  
**Files planned:** 19 modified, 3 new  
**Tests planned:** 5 updated suites  
**Next:** step-03-execute.md
