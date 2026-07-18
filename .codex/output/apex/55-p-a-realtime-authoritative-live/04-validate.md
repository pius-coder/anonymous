# Step 04: Validate

**Task:** P-A-REALTIME - Live autoritaire, persistence et reconnexion
**Started:** 2026-07-18T01:21:50Z

---

## Validation Progress

- Built workspace packages required by isolated package tests:
  - `scripts/worktree-run pnpm --filter @session-jeu/config --filter @session-jeu/shared --filter @session-jeu/db --filter @session-jeu/contracts --filter @session-jeu/game-engine build`
  - result: passed
- Game-server unit validation:
  - `scripts/worktree-run pnpm --filter @session-jeu/game-server test:unit`
  - result: passed (`4` files / `27` tests)
- API live route validation:
  - `scripts/worktree-run pnpm --filter @session-jeu/api exec vitest run src/routes/__tests__/live.test.ts`
  - result: passed (`5` tests)
- Transport validation with `@colyseus/testing`:
  - `scripts/worktree-run pnpm --filter @session-jeu/game-server test:transport`
  - result: passed
- Browser L5 validation:
  - `scripts/worktree-run pnpm infra:up:migrate`
  - `scripts/worktree-run env DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/session_jeu_wt_p_a_realtime?schema=public TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/session_jeu_wt_p_a_realtime?schema=public REDIS_URL=redis://127.0.0.1:6379/14 CI=1 pnpm --filter @session-jeu/web exec playwright test e2e/room.spec.ts e2e/live-smoke.spec.ts --project=chromium`
  - result: passed (`3` specs)
- Infra observation:
  - `.env.worktree.local` currently points to stale local ports (`15446` / `16393`) while local backend actually serves PostgreSQL on `5432` and Redis on `6379`.
  - validations succeeded only when both `DATABASE_URL` and `TEST_DATABASE_URL` were overridden alongside `REDIS_URL`.
