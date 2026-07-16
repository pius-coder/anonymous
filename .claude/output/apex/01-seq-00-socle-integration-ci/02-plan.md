# Step 02: Plan

**Task:** SEQ-00 - Installer le socle d'integration et CI
**Mode:** auto-approved (`-a`)

---

## Strategy

Build shared test orchestration under `scripts/` + root `tests/integration/`, parametrize compose, wire root/turbo scripts, Playwright webServer[], GH Actions CI, and docs. No business code in `apps/**/src` or `packages/**/src`.

**Infra backends:**
1. **docker** (CI default): compose project `sj-{WORKTREE_ID}`, host ports from offset, volumes torn down with `-v`.
2. **local** (auto if no docker): create disposable DB `session_jeu_wt_{id}` on host Postgres; Redis DB index; still unique app ports.

**Port formula** (`offset = hash(WORKTREE_ID) % 200`):
| Resource | Port |
|----------|------|
| API | `3100 + offset` |
| GAME_SERVER | `3300 + offset` |
| WEB | `3500 + offset` |
| WORKER (reserved) | `3700 + offset` |
| Postgres host (docker) | `15432 + offset` |
| Redis host (docker) | `16379 + offset` |

---

## File-by-file plan

### Create `scripts/lib/worktree-env.mjs`
- Resolve `WORKTREE_ID` (env or stable hash of cwd basename).
- Compute ports, DB name, compose project, REDIS_URL, DATABASE_URL, GAME_WS_URL, E2E_BASE_URL.
- `redactSecrets(text)` / `safeLog` — never log passwords/tokens/cookies.
- Export `toProcessEnv()` for child processes.

### Create `scripts/lib/infra.mjs`
- `detectBackend()`: docker if `docker compose version` succeeds, else local (or forced via `TEST_INFRA_BACKEND`).
- `up()` / `down()` with try/finally semantics for callers.
- Docker: `docker compose -f docker-compose.yml -f docker-compose.test.yml -p $PROJECT up -d --wait`.
- Local: CREATE DATABASE IF NOT EXISTS; redis SELECT + FLUSHDB; down drops DB and FLUSHDB.

### Create `scripts/run-integration.mjs`
1. env + up infra
2. `prisma generate` + `prisma migrate deploy` (empty DB)
3. spawn API + game-server with env (tsx, not NODE_ENV=test so they listen)
4. wait for `/health` and game port
5. `vitest run --config tests/integration/vitest.config.ts`
6. always kill services + down infra

### Create `scripts/run-e2e.mjs`
1. env + up + migrate
2. ensure packages built as needed
3. `pnpm --filter @session-jeu/web test:e2e` with env (Playwright starts webServers)
4. always teardown

### Create `scripts/run-unit.mjs`
- `turbo run test` only (alias-safe unit path)

### Create `tests/integration/vitest.config.ts` + smokes
- `l3-postgres.smoke.test.ts`: migrate applied; Prisma `$queryRaw SELECT 1`; optional table probe on `_prisma_migrations`.
- `l4-api.smoke.test.ts`: HTTP GET `/health`; Connect-style POST to Identity or health path over real transport.
- `l4-colyseus.smoke.test.ts`: TCP/WS reachability to GAME_SERVER_PORT; Client matchmake attempt proves server responds (auth failure OK).

### Create `apps/web/e2e/live-smoke.spec.ts`
- Asserts GAME_WS_URL WebSocket opens; **fails hard** if game-server down; no local-preview fallback.

### Modify `apps/web/playwright.config.ts`
- `webServer[]`: api (tsx), game-server (tsx), web (`next dev` or start on WEB_PORT).
- env from process; `reuseExistingServer: !CI`; timeouts 120s.
- baseURL from E2E_BASE_URL / WEB_PORT.

### Modify `docker-compose.yml`
- Remove fixed container_name; use `${POSTGRES_PORT}` / `${REDIS_PORT}` host mapping.
- Env-driven DB name `POSTGRES_DB`.
- Keep healthchecks.

### Create `docker-compose.test.yml`
- Ephemeral: no persistent named volume reuse across projects (project-scoped volumes + down -v).

### Modify `package.json` (root)
```json
"test:unit": "node scripts/run-unit.mjs",
"test:integration": "node scripts/run-integration.mjs",
"test:e2e": "node scripts/run-e2e.mjs",
"test:all": "pnpm test:unit && pnpm test:integration && pnpm test:e2e",
"infra:up": "...",
"infra:down": "..."
```
Add root devDeps if needed: `vitest`, `@colyseus/sdk` (or use workspace), `@prisma/client` for harness.

### Modify `turbo.json`
- `test` outputs/env
- `test:unit`, `test:integration`, `test:e2e` tasks with `cache: false` for integration/e2e, passThroughEnv for WORKTREE_*, DATABASE_URL, ports, CI, PLAYWRIGHT_*

### Modify `.env.example`
- Document WORKTREE_ID, TEST_INFRA_BACKEND, port vars, GAME_SERVER_PORT, REDIS_URL, E2E_BASE_URL, TEST_DATABASE_URL.

### Create `.github/workflows/ci.yml`
- services or script-driven docker
- frozen-lockfile install
- contracts generate + prisma generate
- migrate empty
- unit → integration → e2e
- typecheck, lint, build
- playwright install chromium
- artifact upload: playwright-report, test-results (redacted)

### Create `docs/05-workflows/test-commands.md`
- Commands, timeouts, artifacts, diagnosis, worktree isolation, secret logging rules.
- Link from `docs/README.md` and update `test-strategy.md` one-liner that scripts now exist.

### packages/db package.json
- Add `"db:migrate:deploy": "prisma migrate deploy"` for CI empty migrate (script only).

### Root package.json lockfile
- pnpm install if new deps.

---

## Out of scope

- Business UI, proto, schema/migrations content, fixing room.spec local preview, SEQ-01/02 work.

## AC mapping

| AC | Files |
|----|-------|
| Distinct scripts | package.json, run-*.mjs |
| Disposable PG/Redis | infra.mjs, compose files |
| Unique ports | worktree-env.mjs |
| Playwright webServer | playwright.config.ts, run-e2e.mjs |
| L3/L4/L5 harness | tests/integration/*, live-smoke.spec.ts |
| CI pipeline | .github/workflows/ci.yml |
| Docs | test-commands.md |

## Risks

- No docker on current host → local backend for validation; CI uses docker.
- Full Colyseus join needs live token/DB seed → smoke proves boot + WS response only.
- Auth e2e needs working API+DB; webServer must pass DATABASE_URL.
- Next build for e2e may be slow; prefer `next dev` for webServer unless CI needs start.
