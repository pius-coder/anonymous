# Step 02: Plan

**Task:** P-A-ADMIN Command center et arbitrage production  
**Mode:** auto + economy + save  
**Started after analyze:** 2026-07-17

---

## Implementation Plan: P-A-ADMIN command center

### Overview

Wire the existing admin REST use-cases (party / preparation / round) and the frozen **AdminService** read RPCs into a real command center UI on ownership routes, add **optimistic concurrency + Redis control lease** for multi-admin safety without schema/proto changes, and prove AC via L1/L3/L4/L5 tests. No central RPC mount edit; AdminService handler is exported and tested with local `createRouterTransport` (pattern `session-participation.l4.test.ts`).

### Prerequisites

- [ ] **BLOCKER:** clean principal checkout so `pnpm worktree:create -- p-a-admin HEAD` succeeds  
- [ ] Worktree `apex/p-a-admin` + `scripts/worktree-up`  
- [ ] P-SEQ-00/02/03 already on base (assumed on `v0.1` HEAD)  
- [ ] No contracts/DB edits  
- [ ] No edits to `apps/api/src/rpc/routes.ts` (montage central)

### Recommended decisions (auto_mode)

| Ambiguity | Choice |
|-----------|--------|
| Lease sans table DB | Redis key `admin:lease:{partyId}` via `ioredis` (TTL + holder userId) |
| Concurrence commandes | `expectedUpdatedAt` / `expectedConfigVersion` sur mutations sensibles (pattern scoring) |
| AdminService mount | Handler public + L4 local transport; note pour SEQ merge mount |
| Fee/capacity | Exposer champs existants repo/schema dans DTO use-case (pas de migration) |
| Cancel/fin | Use-cases + REST appelant domain `cancel` / `completeGame` |
| Six manifests | UI compose catalogue via API publique minigames existante ou empty/error si absente; pas inventer P-SEQ-06 |
| Pages hors ownership | Ne pas modifier payments/wallets/scores mutation/compliance/incidents |
| Hardcode removal | Loading/empty/error/stale/reconnect; zero fixtures locales sur pages ownership |

---

### File Changes

#### A. Domain / application (API)

##### 1. `apps/api/src/lib/admin-control-lease.ts` (**create**)

- `acquireLease(partyId, userId, ttlSec)`
- `releaseLease(partyId, userId)`
- `assertLease(partyId, userId)` → `ADMIN_LEASE_REQUIRED` / `LEASE_HELD_BY_OTHER`
- Redis implementation; unit-testable with mock redis
- Fail-closed if Redis down for **sensitive** commands (configurable: degrade read-only)

##### 2. `apps/api/src/use-cases/party/party.use-case.ts` (**modify**)

- Map `entryFeeAmount`, `entryFeeCurrency`, `configVersion`, `feeVersion`, `description` in admin DTO
- Accept fee/capacity/schedule fields on create/update (via existing repository fields)
- Add `listAdminParties({ status?, pageSize?, pageToken? })`
- Add `cancelParty({ id, reason, actorId, expectedUpdatedAt? })` → domain cancel + status
- Add `completeParty({ id, reason, actorId, expectedUpdatedAt? })` when terminal transition allowed
- Optimistic check: if `expectedUpdatedAt` / `expectedConfigVersion` mismatch → `STALE_STATE` 409
- Do **not** auto-start on schedule

##### 3. `apps/api/src/use-cases/round/round.use-case.ts` (**modify**)

- Accept optional `expectedPartyUpdatedAt` / lease assert hook via caller
- Clear precondition errors (invalid transition) with codes already used
- No auto-activate from timers

##### 4. `apps/api/src/use-cases/admin/admin-command.use-case.ts` (**create**)

- Facade for sensitive ops: acquire/release lease, then party/round/prep commands with version check
- Centralize audit payload: action, actor, partyId, reason, result, beforeVersion, afterVersion
- Used by REST admin routes for write paths

##### 5. `apps/api/src/use-cases/admin/admin-read.use-case.ts` (**create**)

- `getAdminGameState(partyId)` projection for AdminService + monitor UI
- `getReadonlySnapshot(partyId)` filtered
- `listAdminParties` wrap
- `getSystemReadiness` (no secrets; optional deep probes if already available)

##### 6. `apps/api/src/routes/admin/party.ts` (**modify**)

- GET `/parties` list admin
- POST cancel / complete (or `/cancel`, `/complete`)
- Wire fee fields in create/update schemas
- Require lease + version on publish/cancel/schedule/config when active multi-admin path
- Keep `requireRole("ADMIN","SUPER_ADMIN")`
- Improve error body: code + message precondition (no stack/internal)

##### 7. `apps/api/src/routes/admin/preparation.ts` / `round.ts` (**modify**)

- Optional lease assert on confirm-start, activate, pause, resume, close
- Pass expected version when client provides header/body field
- auditLog already present; enrich via admin-command facade when reason present

##### 8. `apps/api/src/routes/admin/lease.ts` (**create**)

- POST `/parties/:id/control-lease` acquire
- DELETE release
- GET status
- Admin only

##### 9. `apps/api/src/middleware/rbac.ts` (**modify lightly**)

- Optional helper `requireAdminNotPlayer` already covered by role list
- Ensure PLAYER-only tokens get 403 with stable code on admin routers (existing)

##### 10. `apps/api/src/rpc/admin-service.ts` (**create**)

- Implement `AdminService` handlers (4 RPCs only) calling admin-read use-case
- `requireRpcRole(ADMIN, SUPER_ADMIN)` for GetGameState/ListParties/GetSystemReadiness
- GetReadonlySnapshot: ADMIN + support roles if policy allows, else admin only
- Export `adminService` for SEQ mount later
- **Do not** edit `routes.ts`

##### 11. Audit enrichment

- Prefer `auditRepository.createAuditLog` with action strings stable
- If entity payload limited, encode reason/result in `action` or existing fields only (no schema change)
- List endpoint for party timeline used by UI audit page ownership

#### B. Web (ownership UI)

##### 12. `apps/web/src/services/admin/*` (**create**)

- `adminPartyApi.ts` — REST create/update/publish/schedule/cancel/list/get
- `adminLeaseApi.ts` — acquire/release/status
- `adminAuditApi.ts` — list audit for party if API exists; else degrade empty+error
- Reuse `preparationClient`, `RoundService`, `AdminService` Connect client for reads

##### 13. `apps/web/src/app/admin/page.tsx` (**rewrite data**)

- Load via AdminService.listParties or REST list
- Metrics derived from live list; empty/error/loading states
- Remove `activeParties` constants

##### 14. `apps/web/src/app/admin/parties/page.tsx` (**rewrite**)

- Real list; links to setup/control/monitor by status
- Empty when none

##### 15. `apps/web/src/components/admin/PartySetupView.tsx` (**rewrite**)

- Controlled form bound to API (create vs edit)
- Fee, capacity, schedule, program selection (compose manifests from public catalog if available)
- Publish/validate/cancel actions with SensitiveActionPanel
- No hardcoded party names/prices

##### 16. `apps/web/src/app/admin/parties/new/page.tsx` + setup page

- Pass mode create/edit only; data from API

##### 17. `apps/web/src/components/admin/AdminPreparationPanel.tsx` (**extend**)

- Already wired; add lease badge + acquire before confirm-start
- Stale detection already partial; surface STALE_STATE / LEASE errors

##### 18. `apps/web/src/components/admin/AdminRoundControls.tsx` (**extend**)

- Remove hard default audit strings / pilot minigame as required defaults (use empty + validation)
- Lease-aware commands
- Wire on control page with real round id from party state

##### 19. `apps/web/src/app/admin/parties/[partyId]/control/page.tsx` (**extend**)

- Combine prep panel + round controls + lease panel
- Explicit confirm; no auto timer

##### 20. `apps/web/src/app/admin/parties/[partyId]/monitor/page.tsx` (**rewrite**)

- Readonly AdminService.gameState / snapshot
- loading/error/stale/reconnect via ConnectionStatus real state if available, else polling stale flag
- No hardcoded players

##### 21. `apps/web/src/app/admin/parties/[partyId]/audit/page.tsx` (**rewrite**)

- Fetch audit timeline API; empty if none
- Remove fake lease events

##### 22. `apps/web/src/app/admin/minigames/page.tsx` (**rewrite**)

- Load manifests from existing public/runtime catalog service if present
- Else empty + error « catalogue indisponible » — **no fake games**
- No "Ajouter manifeste" mutation if not in ownership (button disabled or hidden)

##### 23. `apps/web/src/components/admin/AdminControlLeasePanel.tsx` (**create**)

- Acquire / release / holder display / conflict message

##### 24. Out of scope pages

- Do not change: payments, wallets, scores page mutation ownership, compliance, users, super-admin

#### C. Tests

##### 25. L1

- Extend `packages/game-engine` if new transition helpers (prefer reuse)
- RBAC unit: player cannot pass admin role middleware

##### 26. L3

- `apps/api` integration: two concurrent updateParty with same expectedVersion → one 409
- Lease: second admin acquire fails while first holds
- Audit row created on publish/cancel/confirm-start

##### 27. L4

- `apps/api/src/rpc/__tests__/admin-service.l4.test.ts` — local router, AdminService methods, role forbidden for player

##### 28. L5

- Flow test: two admin actors + player; player REST admin 403; admin A lease + command; admin B stale/lease conflict visible

##### 29. UI tests

- Minimal: Admin dashboard empty/error; PartySetup submit validation; no hardcoded strings in unit snapshot optional

#### D. Docs / runbook

##### 30. `docs/05-workflows/` or lot note under `.claude/output/.../runbook-arbitrage.md`

- How to acquire lease, recover stuck lease (TTL), multi-admin conflict codes
- Explicit: no job starts party

---

### AC → changes map

| AC | Implementation |
|----|----------------|
| No clock starts party | Keep worker deadline close-only; schedule ≠ activate; tests assert no start job |
| Multi-admin no silent overwrite | Lease Redis + expectedVersion 409 |
| Refus expliqué | Use-case codes STALE_STATE, ADMIN_LEASE_REQUIRED, FORBIDDEN, INVALID_TRANSITION |
| Player/observer no admin cmds | requireRole/requireRpcRole on all write + L4/L5 |
| No hardcoded ownership pages | Rewrite listed pages to API-driven states |

---

### Order of execution

1. Worktree create (after clean principal)
2. Lease lib + admin-read/admin-command use-cases
3. party.use-case extensions (list/cancel/fee/version)
4. REST routes (party list/cancel/lease + wire version)
5. admin-service.ts + L4 tests
6. Web services + lease panel
7. Rewrite ownership UI pages
8. L3/L5 tests + runbook
9. Gates: typecheck/lint/unit affected
10. Atomic commit on `apex/p-a-admin`

---

### Risks

| Risk | Mitigation |
|------|------------|
| AdminService not in central router | L4 local mount; handoff note for SEQ |
| Redis unavailable | Fail-closed on sensitive writes; reads still work |
| fee fields never set by createParty repo | Verify repository create accepts fee; use existing types |
| Principal dirty forever | Cannot implement without worktree; block execute |
| Over-scope into scoring publish | Monitor/control only; scores page leave as-is |
| Minigame catalog API missing | Degradable empty state |

---

### Explicit non-goals

- Proto field adds / Admin command RPCs
- Prisma migrations / lease table
- Editing `rpc/routes.ts`
- Finance/scoring publication ownership
- P-SEQ-06 six-game merge proof

---

## Plan status

Ready for execute under `-a` once worktree blocker cleared.
