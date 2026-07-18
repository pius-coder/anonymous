# Step 01: Analyze

**Task:** SEQ-00 - Installer le socle d'integration et CI
**Started:** 2026-07-16T11:42:42Z
**Completed:** 2026-07-16T11:50:00Z

---

## Context Discovery

### Related Files Found

| File | Lines | Contains |
|------|-------|----------|
| `package.json` | 6-19 | Root scripts: test/typecheck/lint/build only — no test:unit/integration/e2e/all |
| `turbo.json` | 1-32 | Tasks build/dev/lint/typecheck/test/db:* — no env/outputs for test levels |
| `docker-compose.yml` | 1-40 | Fixed postgres:16 + redis:7 on 5432/6379, fixed container names |
| `.env.example` | 1-35 | DATABASE_URL, PORT=3001, GAME_PORT=2567 (≠ GAME_SERVER_PORT) |
| `apps/web/playwright.config.ts` | 1-20 | e2e dir, chromium, E2E_BASE_URL; **no webServer** |
| `apps/web/e2e/auth.spec.ts` | full | Real IdentityService register/login |
| `apps/web/e2e/room.spec.ts` | full | Expects "Aperçu local"; tolerates live access failure |
| `packages/db/src/__tests__/helpers.ts` | 1-14 | isIntegrationEnv/getTestPrisma unused |
| `apps/api/src/index.ts` | 41-56 | PORT default 3001; skips listen when NODE_ENV=test |
| `apps/game-server/src/config.ts` | 1-7 | GAME_SERVER_PORT default 3002; REDIS_URL |
| `apps/game-server/src/index.ts` | 7-17 | Colyseus Server; skips listen when NODE_ENV=test |
| `docs/06-roadmap/apex-tasks/sequential/SEQ-00-integration-ci.md` | full | Canonical deliverables/AC |
| `docs/05-workflows/test-strategy.md` | 32-59 | L0–L6; states integration scripts missing |

### Patterns Observed

- Monorepo pnpm workspaces + Turbo; each package `"test": "vitest run"`.
- Vitest configs minimal: `globals: true`, `environment: "node"`.
- API dual stack: ConnectRPC adapter + Hono fallback; `/health` JSON.
- Game server requires live token for room join (`GameRoom.onAuth`); boot without auth still binds port.
- Migrations exist under `packages/db/prisma/migrations/` (0000_init + auth/payment/live/round).
- No `.github/workflows`.
- No `WORKTREE_ID` implementation (docs only).

### Environment Facts

- Branch: `v0.1` @ `1baa249`.
- Docker CLI: **absent** on this host.
- Local PostgreSQL 18 accepting on 127.0.0.1:5432 (peer auth as `afreeserv`).
- Local Redis 8 PONG on 6379.
- Staged SEQ-00 tooling: **none** (only docs WIP unstaged).

### Context7 IDs Used

| Library | ID |
|---------|-----|
| Turborepo | `/vercel/turborepo` |
| Vitest | `/vitest-dev/vitest` |
| Playwright | `/microsoft/playwright` |
| Docker Compose | `/docker/compose` (listed) |
| Next.js | `/vercel/next.js` (listed) |

Key docs findings:
- Turbo: `env` / `passThroughEnv` / outputs for e2e (`PLAYWRIGHT_*`).
- Playwright: `webServer: [{ command, url, timeout, reuseExistingServer }]`.
- Vitest: projects + `fileParallelism` for sequential integration files.

### Inferred Acceptance Criteria

- [ ] AC1: Root scripts `test:unit`, `test:integration`, `test:e2e`, `test:all` are distinct (not unit aliases)
- [ ] AC2: Disposable PG/Redis per WORKTREE_ID with guaranteed teardown
- [ ] AC3: Unique API/game-server/web/(worker) ports per WORKTREE_ID
- [ ] AC4: Playwright webServer[] starts API, game-server, web
- [ ] AC5: Harness smokes L3 PG, L4 Connect/Hono, L4 Colyseus, L5 browser live (fails without Colyseus)
- [ ] AC6: CI: frozen install → generate → empty DB migrate → unit → integration → e2e → typecheck/lint/build
- [ ] AC7: Docs for commands, timeouts, artifacts, failure diagnosis; no secrets in logs

### Gaps (what does NOT exist)

- Root multi-level test scripts and turbo tasks
- CI workflows
- Worktree-scoped compose/env orchestration
- Real L3/L4 harness wired into scripts
- Playwright multi-service boot
- Live smoke without local-preview fallback
