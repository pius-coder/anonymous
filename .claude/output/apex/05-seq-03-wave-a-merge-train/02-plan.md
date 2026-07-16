# 02 — Plan: SEQ-03 WAVE-A composition

**Status:** Auto-approved (`-a`)  
**Branch:** `integration/v0.1-completion`

## Overview

WAVE-A lots are already merged. SEQ-03 only **composes** public exports into the central Connect router, documents the 12/57 matrix gaps, runs gates (unit → integration → e2e live smoke), and opens a PR. No feature rewrites, no contracts/schema/migrations.

## Prerequisites

- [x] WAVE-A merges present on branch (`6a6e184`)
- [x] Context7 `/connectrpc/connect-es`, `/git/htmldocs`
- [x] Ownership review A-WORKERS PASS

---

## File Changes

### 1. `apps/api/src/rpc/routes.ts` (PRIMARY — SEQ-03 ownership)

**Current (L1–11):** mounts Identity, Round, Realtime only.

**Change:**
- Import contract namespaces: `SessionV1`, `ParticipationV1`, `PreparationV1`, `PaymentV1`, `ScoringV1` from `@session-jeu/contracts`
- Import handlers: `sessionService`, `participationService`, `preparationService`, `paymentService`, `scoringService` (public exports only; do **not** copy handlers)
- Register each with `router.service(XService, handler)` following Connect ES pattern and existing Identity lines
- Keep existing three mounts unchanged
- Optional one-line comment: WAVE-A composition SEQ-03

**Order of registration (stable, domain lifecycle):**  
Identity → Session → Participation → Preparation → Payment → Round → Realtime → Scoring

### 2. `apps/api/src/rpc/__tests__/routes.composition.test.ts` (NEW)

- Import `createRouterTransport` + `registerRpcRoutes`
- Assert transport builds without throw
- Optionally create clients for Session/Participation/Preparation/Payment/Scoring and assert unauthenticated calls return Connect errors (not "unimplemented service" / connection failures) — proves registration
- Pattern: `session-participation.l4.test.ts` L57–66 but calling production `registerRpcRoutes` instead of ad-hoc mount

### 3. `docs/00-audit/v0.1-rpc-mount-matrix.md` (NEW) or apex `AC-matrix.md`

Document:
- Freeze: 12 services / 57 methods (`packages/contracts/src/matrix.ts`)
- Mounted after SEQ-03: 8 services
- Method counts per service (impl vs freeze)
- Gaps: Realtime 1/4 Connect; MiniGame/Admin/Notification/Compliance unmounted (WAVE-B / future)
- Historical AC "11/50" → superseded by SEQ-01 freeze 12/57

### 4. `docs/00-audit/v0.1-gap-analysis.md` / `v0.1-current-state.md` (MINIMAL if needed)

- Only if existing text claims 3/11 mounted without SEQ-03 update — update mount counts after composition (keep factual, no scope creep)

### 5. Files NOT modified (ownership)

- `packages/contracts/**`, `packages/db/prisma/**`, lockfile (unless forced by deps — avoid)
- WAVE-A use-case / handler bodies
- `apps/web/src/services/rpcServices.ts` (facades already complete)
- `apps/api/src/index.ts` (already wires `registerRpcRoutes`)

---

## Testing Strategy (`-t`)

| Gate | Command | Maps |
|------|---------|------|
| Composition unit | `pnpm --filter @session-jeu/api test` (includes new routes.composition) | AC1, AC4 |
| Unit monorepo | `pnpm test:unit` or turbo test on affected | AC4 |
| Typecheck/lint/build | `pnpm typecheck`, `pnpm lint`, `pnpm --filter @session-jeu/api build` (+ web if needed) | AC3 |
| Integration L3/L4 | `pnpm test:integration` | AC5 |
| E2E multi-service | `pnpm test:e2e` focusing live-smoke / affected | AC6 |
| Docs | `pnpm docs:check` if matrix under docs/ | AC8 |

If integration/e2e infra unavailable, document failure and still land composition if typecheck+unit green; note residual risk.

---

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1 | `routes.ts` mounts 5 exports |
| AC2 | matrix doc + analyze appendix |
| AC3 | typecheck/lint/build |
| AC4 | api tests + composition test |
| AC5 | `test:integration` |
| AC6 | `live-smoke` / e2e |
| AC7 | documented in validate + PR body |
| AC8 | `AC-matrix.md` in apex output + docs matrix |
| AC9 | `gh pr create` from `integration/v0.1-completion` → `v0.1` |
| AC10 | diff review excludes contracts/schema |

---

## Execution Order

1. Edit `routes.ts`
2. Add composition test
3. Add AC matrix doc
4. Run api unit + typecheck + lint
5. Run integration
6. Run e2e live-smoke (or full e2e)
7. Examine (`-x`): adversarial check ownership + no logic copy
8. Commit (clear message)
9. Push + PR (`-pr`)

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Partial handlers throw UNIMPLEMENTED for missing methods | Already accepted for Realtime; WAVE-A handlers implement full method sets for their services |
| Type error `Partial<ServiceImpl>` vs `router.service` | Existing Identity uses Partial; same pattern |
| Heavy L3/e2e infra flakiness | Retry once; document if blocked |
| PR into `v0.1` while already containing WAVE-A history | PR only composition + docs commits; base `v0.1` may need push of integration branch only |

---

## Step Complete
**Status:** ✓ Complete (auto-approved)  
**Files planned:** 2–4  
**Tests planned:** 1 new + existing gates  
**Next:** step-03-execute.md  
**Timestamp:** 2026-07-16T19:46:00Z
