# Step 03: Execute

**Task:** P-A-REALTIME - Live autoritaire, persistence et reconnexion
**Started:** 2026-07-18T01:21:50Z

---

## Implementation Log

- Hardened `apps/game-server` boot and runtime policy:
  - fail-fast env parsing for `GAME_WS_URL`, origin allowlist, payload limits, rate windows, Redis readiness and `noeviction` enforcement.
  - Redis `Presence` + `Driver` wiring for multi-instance ownership.
  - explicit readiness probe before listen and graceful SIGINT/SIGTERM shutdown path with metrics dump.
- Added live metrics and readiness helpers:
  - `src/metrics.ts` for joins, drops, reconnects, late/duplicate inputs and reject reasons.
  - `src/runtime/readiness.ts` to assert Redis connectivity and memory policy before boot.
- Tightened live admission and access:
  - `live-access.use-case.ts` now requires `GAME_WS_URL`, validates party/round/participation/payment/admission and issues short-lived connection tokens.
  - `live-auth.ts` mirrors those checks at room join time and rejects unpaid / unadmitted / round-invalid actors.
  - support audience role added in `live-roles.ts`.
- Centralized projection redaction:
  - new `src/projections/live-projections.ts` with distinct player/admin/readonly/support snapshots.
  - `readonly-handler.ts` now dispatches correct audience-specific snapshots.
- Enforced authoritative room behavior in `GameRoom.ts`:
  - validate before persistence, reject oversized payloads and over-budget message bursts.
  - record duplicates/late inputs/rejects in metrics.
  - fail join/disconnect persistence loudly instead of swallowing downstream errors.
  - reconnect/disconnect state mirrored into participation persistence.
  - deadline close no longer mutates in-memory state after a persistence failure.
- Removed implicit web preview fallback:
  - `live-room-facade.ts`, `createRoomGame.ts`, `RoomExperience.tsx`, `PhaserRoomCanvas.tsx` now expose explicit offline state instead of preview mode.
- Updated tests for new rules:
  - API live access tests for `GAME_WS_URL` and unpaid-player rejection.
  - game-server unit/integration/transport tests for payment/admission gating, persistence updates and snapshot shape.
  - Playwright room spec aligned with explicit offline state and expected `CreateLiveAccess` denial noise.
