# 01 — Analyze: SEQ-03 WAVE-A merge train

**Completed:** 2026-07-16T19:45:00Z  
**Branch:** `integration/v0.1-completion` @ `6a6e184`  
**Context7 IDs:** `/connectrpc/connect-es`, `/git/htmldocs`

## Codebase Context

### Related Files

| File | Lines | Contains |
|------|-------|----------|
| `apps/api/src/rpc/routes.ts` | 1–11 | Central Connect router — Identity/Round/Realtime only |
| `apps/api/src/index.ts` | 17, 43–56 | `connectNodeAdapter({ routes: registerRpcRoutes })` |
| `apps/api/src/rpc/session-service.ts` | 133+ | `sessionService` export, SEQ-03 mount comment |
| `apps/api/src/rpc/participation-service.ts` | 97+ | `participationService` export |
| `apps/api/src/rpc/preparation-service.ts` | 44+ | `preparationService` export |
| `apps/api/src/rpc/payment-service.ts` | 69+, 189 | `paymentService`, `getPaymentServiceHandlers()` |
| `apps/api/src/rpc/scoring-service.ts` | 76+, 172 | `scoringService`, `SCORING_SERVICE_MOUNT` |
| `apps/web/src/lib/rpc.ts` | 36–48 | 11 `rpcClients` already defined |
| `apps/web/src/services/rpcServices.ts` | full | Facades for session/participation/prep/payment/scoring |
| `packages/contracts/src/matrix.ts` | 30–167 | Freeze **12 services / 57 methods** |
| `tests/integration/*.smoke.test.ts` | — | L3 PG + L4 API/Colyseus/identity |
| `apps/web/e2e/live-smoke.spec.ts` | — | L5 multi-service room live |
| `scripts/run-integration.mjs` | — | Empty migrate + API + Colyseus smokes |
| `docs/06-roadmap/apex-tasks/sequential/SEQ-03-wave-a-merge-train.md` | — | Procedure & AC |

### Patterns Observed

- **Composition pattern:** `registerRpcRoutes(router)` calls `router.service(ContractService, handler)` (Connect ES).
- **Handler type:** all handlers are `Partial<ServiceImpl<…>>` (allowed by Connect for partial method sets).
- **Lot ownership:** WAVE-A handlers intentionally do **not** register themselves; comments point to SEQ-03.
- **L4 isolation:** tests use `createRouterTransport(({ service }) => service(...))` — independent of `routes.ts`.
- **Live process:** only services in `routes.ts` are reachable over HTTP Connect when API boots via `tsx src/index.ts`.
- **REST still primary for several UI paths:** acquisition/prep/payment E2E use Hono REST adapters; Connect facades exist but fail until mounted.

### Merge state (exists)

Seven WAVE-A PRs already merged into `v0.1` history (now base of `integration/v0.1-completion`):

| Merge | PR | Lot |
|-------|-----|-----|
| `fd88733` | #32 | A-PREPARATION |
| `7cc9bfc` | #28 | A-IDENTITY |
| `e6850e1` | #30 | A-REALTIME |
| `9ffb3ac` | #27 | A-PAYMENT |
| `d2082f8` | #29 | A-SCORING |
| `91c1e61` | #25 | A-WORKERS |
| `6a6e184` | #31 | A-ACQUISITION |

No re-merge of feature logic required; **composition gap remains**.

### Mount matrix (current)

| Service | Export exists | Methods impl | In routes.ts |
|---------|---------------|--------------|--------------|
| IdentityService | yes | 8/8 | YES |
| RoundService | yes | 10/10 | YES |
| RealtimeAccessService | yes | 1/4 | YES |
| SessionService | yes | 4/4 | **NO** |
| ParticipationService | yes | 3/3 | **NO** |
| PreparationService | yes | 5/5 | **NO** |
| PaymentService | yes | 4/4 | **NO** |
| ScoringService | yes | 4/4 | **NO** |
| MiniGame/Admin/Notification/Compliance | no handlers | 0 | NO |

**Mounted services:** 3/12  
**WAVE-A handlers ready to mount:** 5 (Session, Participation, Preparation, Payment, Scoring)  
**Method coverage handlers present:** 39/42 for those 8 services; freeze total 57 methods.

### Test Patterns

- Root: `pnpm typecheck|lint|test|test:unit|test:integration|test:e2e|test:all|docs:check|build`
- Integration: disposable PG empty migrate, API + game-server, 4 smokes
- E2E: Playwright with multi-webServer (api, game, web); `live-smoke.spec.ts` is multi-service live
- Domain L3/L4 live under package vitest with skipIf (not all in integration runner)

### Open checkboxes from PR bodies

1. A-REALTIME: `[ ] Integrator: L5 multi-service smoke / room live after SEQ-03 merge train`
2. A-WORKERS: `[ ] Review ownership` — verified PASS (worker + gateway + lockfile only)

### Context7 insights

- Connect: `router.service(Service, { methodImpls })` is the registration API used by this repo.
- Git: `--no-ff` forces merge commits for topic → integration history (lots already have PR merges).

## Inferred Acceptance Criteria

- [ ] AC1: `routes.ts` mounts all five WAVE-A Connect exports without inlining business logic
- [ ] AC2: Remeasure freeze matrix (12/57) and document remaining gaps (Realtime 1/4, MiniGame/Admin/Notification/Compliance unmounted)
- [ ] AC3: `pnpm typecheck`, `lint`, `build` green for affected workspaces
- [ ] AC4: Unit + L4 package tests for mounted domains still pass
- [ ] AC5: `pnpm test:integration` green (empty DB + multi-service smokes)
- [ ] AC6: L5 multi-service live smoke (`live-smoke` / e2e affected) green when infra available
- [ ] AC7: A-WORKERS ownership review documented PASS
- [ ] AC8: AC→test matrix artifact in apex output / docs
- [ ] AC9: PR opened from `integration/v0.1-completion` (`-pr`)
- [ ] AC10: No contracts/schema/migration ownership violations by integrator

## Context7 IDs used

- `/connectrpc/connect-es` — ConnectRouter.service registration
- `/git/htmldocs` — merge --no-ff integration workflow
