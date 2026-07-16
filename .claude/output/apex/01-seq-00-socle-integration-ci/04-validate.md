# Step 04: Validate

## Commands and results

| Command | Exit | Duration (approx) |
|---------|------|-------------------|
| `pnpm docs:check` | 0 | 1s |
| `pnpm test:unit` | 0 | 11s |
| `TEST_INFRA_BACKEND=local WORKTREE_ID=seq00-validate pnpm test:integration` | 0 | 24s (7 harness tests) |
| `TEST_INFRA_BACKEND=local WORKTREE_ID=seq00-e2e pnpm test:e2e` | 0 | 86s (4 Playwright tests incl. live-smoke) |
| `pnpm typecheck` | 0 | 13s |
| `pnpm lint` | 0 | 18s (warnings only in generated contracts) |
| `pnpm build` | 0 | 76s |
| `git diff --check` (SEQ-00 paths) | 0 | - |

## Script identity check
- `test:unit` → `scripts/run-unit.mjs` → turbo test
- `test:integration` → infra + migrate + API/game + vitest integration
- `test:e2e` → infra + migrate + playwright webServer[]
- **Not** unit aliases

## Port isolation
- wt-a vs wt-b: distinct API/GAME/WEB/POSTGRES/REDIS ports and DB names (`ports_differ true`)

## Secrets
- Integration log redaction: no password/token/cookie URL leaks detected

## Real frontiers
- L3: real PostgreSQL + `_prisma_migrations` + User table
- L4: live HTTP `/health` + Connect path; Colyseus TCP/HTTP
- L5: browser WS to Colyseus via webServer game-server (no local preview fallback)

## Residual risks
1. Docker not available on this host — CI uses docker; local uses host PG/Redis.
2. Authenticated Colyseus join (live token) is product-scope; smoke proves boot + WS only.
3. `apps/web/e2e/room.spec.ts` still allows local preview (pre-existing); live-smoke is the hard gate.
4. App processes may load root `.env` via dotenv; harness env vars take precedence when set.

## Context7 IDs
- `/vercel/turborepo`, `/vitest-dev/vitest`, `/microsoft/playwright`, `/docker/compose`, `/vercel/next.js`
