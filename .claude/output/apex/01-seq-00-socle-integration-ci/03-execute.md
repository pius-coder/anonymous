# Step 03: Execute

**Task:** SEQ-00 - Installer le socle d'integration et CI

## Implemented

### Scripts
- `scripts/lib/worktree-env.mjs` — WORKTREE_ID, ports, redactSecrets
- `scripts/lib/infra.mjs` — docker|local backends, up/down, migrate, service spawn
- `scripts/run-unit.mjs` / `run-integration.mjs` / `run-e2e.mjs`
- `scripts/infra-up.mjs` / `infra-down.mjs`
- `scripts/e2e-webserver-game.mjs` — Colyseus + HTTP ready probe for Playwright

### Harness
- `tests/integration/vitest.config.ts`
- `tests/integration/l3-postgres.smoke.test.ts`
- `tests/integration/l4-api.smoke.test.ts`
- `tests/integration/l4-colyseus.smoke.test.ts`
- `apps/web/e2e/live-smoke.spec.ts`

### Config / CI / docs
- Root `package.json` scripts + vitest/prisma devDeps
- `turbo.json` test:unit|integration|e2e
- `docker-compose.yml` + `docker-compose.test.yml` parametrized ports
- `.env.example` worktree vars
- `.github/workflows/ci.yml`
- `docs/05-workflows/test-commands.md` + strategy/README/worktrees updates
- `packages/db` script `db:migrate:deploy`
- lockfile updated via `pnpm install`

## Notes
- Host without Docker uses `TEST_INFRA_BACKEND=local` (auto-detected).
- Local PG uses unix socket peer URL for Prisma.
- No business code under apps/**/src or packages/**/src.
