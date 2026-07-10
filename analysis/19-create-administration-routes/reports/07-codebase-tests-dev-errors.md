# Agent 07 Report - Codebase Tests and Dev Errors

**Date:** 2026-07-09  
**Source files examined:** root `package.json`, `turbo.json`, all `package.json` under `apps/*` and `packages/*`, `apps/web/next.config.ts`, `apps/web/playwright.config.ts`, `apps/web/vitest.config.ts`, `apps/api/vitest.config.ts`, test results and Playwright reports, and previous analysis reports 01 and 02.

---

## 1. Script Definitions and Package Manager Version

| Property | Value |
|---|---|
| Package manager | `pnpm@9.15.4` |
| TypeScript | `^5.9.3` (root) / `^5.6.0` (most packages) |
| Turbo | `^2.10.4` |

### Root scripts (root `package.json:7-16`)

| Script | Command | Scope |
|---|---|---|
| `dev` | `turbo run dev` | All packages |
| `build` | `turbo run build` | All packages |
| `lint` | `turbo run lint` | All packages |
| `typecheck` | `turbo run typecheck` | All packages |
| `test` | `turbo run test` | All packages |
| `db:migrate` | `turbo run db:migrate --filter=@session-jeu/db` | DB only |
| `db:seed` | `turbo run db:seed --filter=@session-jeu/db` | DB only |
| `db:studio` | `turbo run db:studio --filter=@session-jeu/db` | DB only |

### Per-package scripts

| Package | `dev` | `test` | `typecheck` | `lint` | `build` | `test:e2e` |
|---|---|---|---|---|---|---|
| `@session-jeu/web` | `next dev --port 3000` | `vitest run` | `tsc --noEmit` | `eslint .` | `next build` | `playwright test` |
| `@session-jeu/api` | `tsx watch src/index.ts` | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/game-server` | `tsx watch src/index.ts` | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/worker` | `tsx watch src/index.ts` | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/whatsapp-gateway` | `tsx watch src/index.ts` | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/db` | — | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/game-engine` | — | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |
| `@session-jeu/shared` | — | `vitest run` | `tsc --noEmit` | `eslint src/` | `tsc` | — |

### Vitest configurations

- **`apps/web/vitest.config.ts`**: `globals: true`, `environment: "node"`, **excludes** `e2e/**` and `node_modules/**`.
- **`apps/api/vitest.config.ts`**: `globals: true`, `environment: "node"`.

### E2E configuration (`apps/web/playwright.config.ts`)

- `testDir: "./e2e"`, `fullyParallel: true`, `forbidOnly: !!process.env.CI`
- `retries: CI ? 2 : 0`, `workers: CI ? 1 : undefined`
- `reporter: "html"`, `baseURL: process.env.E2E_BASE_URL || "http://localhost:3000"`
- Single project: **chromium only** (Desktop Chrome).

---

## 2. Turbo Task Definitions and Root-Task Recursion Risk

### Turbo task definitions (`turbo.json`)

| Task | `dependsOn` | `cache` | `persistent` | `outputs` |
|---|---|---|---|---|
| `build` | `["^build"]` | (default true) | — | `["dist/**", ".next/**", "!.next/cache/**"]` |
| `dev` | — | `false` | `true` | — |
| `lint` | `["^build"]` | (default true) | — | — |
| `typecheck` | `["^build"]` | (default true) | — | — |
| `test` | `["^build"]` | (default true) | — | — |
| `db:migrate` | — | `false` | — | — |
| `db:seed` | — | `false` | — | — |
| `db:studio` | — | `false` | — | — |

### Recursion risk analysis

**No root-task recursion risk is visible.** The root scripts call `turbo run <task>` which dispatches to each workspace's matching script. No workspace defines a `turbo` script that would cause recursive `turbo run` invocations. All workspaces define flat npm scripts (e.g., `next build`, `vitest run`, `tsc`) — none invoke `turbo` themselves.

### Dependency chain for `test`

`turbo run test` → each package runs its own `test` script. The `dependsOn: ["^build"]` means upstream workspace builds must complete first. This could cause a failure chain if any upstream build fails (e.g., `@session-jeu/db` build fails → `@session-jeu/api` test cannot proceed).

---

## 3. Existing Test Setup for Web/API and Admin Coverage

### API tests (Vitest, 53+ admin tests)

All under `apps/api/src/routes/__tests__/` — 10 admin-specific test files:

| Test file | Tests | Coverage |
|---|---|---|
| `admin-sessions.test.ts` | 12 | CRUD, publish, cancel, OCC, compliance, audit |
| `admin-operations.test.ts` | 10 | Dashboard, audit logs, support view, incidents, admin actions, approval, secrets masking |
| `admin-minigames.test.ts` | 5 | List, enable/disable, validate config, risk check |
| `admin-payments.test.ts` | 4 | Reconcile, reason required, 404, 403 |
| `admin-wallets.test.ts` | 3 | Adjust, reason required, 403 |
| `admin-lobby.test.ts` | 3 | Start session, min players, 403 |
| `admin-live.test.ts` | 3 | Pause, resume, 403 |
| `admin-results.test.ts` | 4 | Finalize, tie policy, 403, correction request |
| `admin-notifications.test.ts` | 3 | Share message, private session, 403 |
| `admin-security.test.ts` | 3 | Compliance gates, moderation, 403 |

**Total admin coverage: ~53 tests across 10 files.**

Additional API unit tests (non-admin):
- `apps/api/src/auth/__tests__/password.test.ts`
- `apps/api/src/auth/__tests__/validation.test.ts`
- `apps/api/src/admin/__tests__/sessionConfig.test.ts`
- Domain module tests: `results`, `wallet`, `minigames`, `payments`, `players`, `notifications`, `lobby`, `security`, `rounds`, `registrations`, `queues`
- Route tests: `auth`, `health`, `lobby`, `live`, `minigames`, `notifications`, `payments`, `players`, `public-session-detail`, `public-sessions`, `registrations`, `results`, `security`, `share`, `wallet`, `whatsapp-webhook`, `internal-anticheat`, `internal-notifications`, `internal-rounds`

### Web tests (Vitest unit)

3 files under `apps/web/src/__tests__/`:

| File | Coverage |
|---|---|
| `index.test.ts` | Basic page existence |
| `pages.test.ts` | Static file list includes admin pages, forbidden wording scan |
| `design-system.test.ts` | RetroUI component imports |

### Web E2E tests (Playwright)

1 file: `apps/web/e2e/feature-01-catalogue-public.spec.ts` — covers public acquisition/catalogue/session detail only.

**No admin E2E tests exist.** No E2E spec covers `/admin/*` routes. The Phase 3 plan (`docs/plan/19-phase3-operateur-lancement.md:304-310`) mandates a Playwright admin route covering "create program 3 rounds → publish → pause/resume live → audit trace".

### Docs-required validations (from `docs/plan/13-dashboard-admin-audit-support.md:86-95` and `docs/plan/19-phase3-operateur-lancement.md:236,304-310,318-325`)

- ✅ Tests RBAC by role: covered for API routes (negative tests in admin-* test files)
- ✅ Dashboard integration tests: `admin-operations.test.ts` covers dashboard KPIs, finance scope, 403
- ✅ Audit written for each sensitive action: tested in `admin-operations.test.ts`
- ✅ Provider secrets masked: tested in `admin-operations.test.ts` (support user view)
- ❌ Sensitive action without reason refused: tested for incidents (`admin-operations.test.ts`) but should be verified per module
- ❌ **Support E2E: user search → consultation without leak** — not implemented
- ❌ **No admin E2E Playwright tests exist** (Phase 3 Sprint 3E requirement)
- ❌ **No Playwright tests for RBAC by role on UI pages**
- ❌ Tests for reason vide bloqué across all mutation endpoints (partially covered)

---

## 4. Evidence Related to Next/Turbopack Cache Persistence Failures

### Test results evidence

The Playwright report at `apps/web/test-results/.last-run.json` shows 4 failed tests (status: `"failed"`). All 4 belong to the same spec `feature-01-catalogue-public.spec.ts`.

**All 4 failures are `ERR_CONNECTION_REFUSED` or `ECONNREFUSED`:**

1. `test-results/feature-01-catalogue-publi-b20f9--→-catalogue-→-détail-→-CTA-chromium/error-context.md`: Error `page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/`.
2. `test-results/feature-01-catalogue-publi-81910-ty-state-affiche-un-message-chromium/error-context.md`: Same error `net::ERR_CONNECTION_REFUSED at http://localhost:3000/catalogue`.
3. `test-results/feature-01-catalogue-publi-e8ea9-existante-affiche-les-infos-chromium/error-context.md`: `apiRequestContext.get: connect ECONNREFUSED ::1:3001` (API server).
4. `test-results/feature-01-catalogue-publi-1adc6-ent-pas-de-wording-interdit-chromium/error-context.md`: Same as #1.

**Root cause analysis:** These failures are not Next.js/Turbopack cache persistence issues. They are **infrastructure failures** — no dev server was running at `localhost:3000` (Next.js) or `localhost:3001` (API) when Playwright attempted to run. The E2E runner requires both `next dev` and the API server to be started before the test suite, which is not currently automated in any npm script or CI configuration.

**No evidence of Next/Turbopack cache persistence failures.** The `.next` directory is excluded from Turbo cache (`outputs: ["dist/**", ".next/**", "!.next/cache/**"]`), but no logs, build errors, or runtime evidence suggest cache corruption or persistence problems.

### Next.js config (`apps/web/next.config.ts`)

- Rewrites `/api/v1/:path*` to configurable `API_URL` (default `http://localhost:3001`/v1/:path*)
- No Turbopack-specific configuration; no custom cache configuration

---

## 5. Validation Commands Required by Docs and Scripts

### Commands defined in `package.json` and usable for validation

| Command | What it runs | Covers |
|---|---|---|
| `pnpm build` | `turbo run build` | All-package build |
| `pnpm lint` | `turbo run lint` | ESLint across all packages |
| `pnpm typecheck` | `turbo run typecheck` | TypeScript `--noEmit` across all packages |
| `pnpm test` | `turbo run test` | Vitest runs across all packages with test files |
| `pnpm format:check` | `prettier --check .` | Formatting |
| `pnpm format` | `prettier --write .` | Auto-format |

### Per-package scripts for targeted validation

| Package | Command | What it runs |
|---|---|---|
| `@session-jeu/web` | `pnpm --filter @session-jeu/web test` | Vitest unit tests only |
| `@session-jeu/web` | `pnpm --filter @session-jeu/web test:e2e` | Playwright E2E tests |
| `@session-jeu/api` | `pnpm --filter @session-jeu/api test` | API Vitest tests |
| `@session-jeu/db` | `pnpm --filter @session-jeu/db db:generate` | Prisma generate |
| `@session-jeu/db` | `pnpm --filter @session-jeu/db db:migrate` | Prisma migrate dev |

### Validation commands required by docs but not scripted

| Requirement | Source | Issue |
|---|---|---|
| E2E test with both Next.js + API running | `playwright.config.ts` expects `localhost:3000` + `localhost:3001` | No script starts both before `test:e2e` |
| Playwright admin route E2E | `docs/plan/19-phase3-operateur-lancement.md:304-310` | Not implemented at all |
| Lighthouse mobile ≥ 85 (public), ≥ 75 (live) | `docs/plan/19-phase3-operateur-lancement.md:298` | No script or CI step |
| Bundle size check (pixi not in public pages chunk) | `docs/plan/19-phase3-operateur-lancement.md:281` | No script |
| Load test (50 simulated players) | `docs/plan/19-phase3-operateur-lancement.md:316` | No script |
| Concurrency/idempotence tests for payments, wallet, capacity, results, jobs | `AGENTS.md` tests section | Existing tests cover basic scenarios; comprehensive concurrency tests status unknown |
| Security tests for auth/RBAC/sensitive data | `AGENTS.md` tests section | API RBAC tests exist; no E2E RBAC tests on UI |

### Key gap: E2E test runner dependency

The Playwright test suite (`test:e2e`) requires both `next dev` (port 3000) and `tsx watch src/index.ts` (port 3001) to be running. No root script or CI configuration orchestrates this. The existing `pnpm test` runs only Vitest — the E2E suite must be invoked separately and manually.
