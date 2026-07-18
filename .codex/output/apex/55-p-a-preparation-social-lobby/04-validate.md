# Step 04: Validate

**Task:** P-A-PREPARATION - Lobby social et readiness
**Started:** 2026-07-18T01:20:54Z

---

## Validation Progress

_Validation results will be appended here..._

## Commands run

- `scripts/worktree-run pnpm infra:up:migrate`
- `scripts/worktree-run pnpm --filter @session-jeu/api test -- --run src/use-cases/preparation/__tests__/preparation.use-case.test.ts src/__tests__/preparation-announcement.l3.integration.test.ts`
- `scripts/worktree-run env DATABASE_URL='postgresql://afreeserv@localhost/session_jeu_wt_p_a_preparation_social_lobby?host=%2Fvar%2Frun%2Fpostgresql&schema=public' TEST_DATABASE_URL='postgresql://afreeserv@localhost/session_jeu_wt_p_a_preparation_social_lobby?host=%2Fvar%2Frun%2Fpostgresql&schema=public' POSTGRES_PORT=5432 pnpm --filter @session-jeu/api test -- --run src/__tests__/preparation-announcement.l3.integration.test.ts`
- `scripts/worktree-run pnpm --filter @session-jeu/api lint`
- `scripts/worktree-run pnpm --filter @session-jeu/web lint`
- `scripts/worktree-run pnpm --filter @session-jeu/api typecheck`
- `scripts/worktree-run pnpm --filter @session-jeu/web typecheck`
- `git diff --check`

## Results

- Internal workspace package `dist/` artifacts confirmed present for `shared`, `config`, `game-engine`, `db`, and `contracts`.
- `infra:up:migrate`: passed, empty worktree DB recreated and migrations applied.
- API unit tests (`preparation.use-case.test.ts`): passed, `17/17`.
- API L3 test (`preparation-announcement.l3.integration.test.ts`): passed, `3/3`.
- `@session-jeu/api` lint: passed.
- `@session-jeu/web` lint: passed.
- `@session-jeu/api` typecheck: passed.
- `@session-jeu/web` typecheck: passed.
- `git diff --check`: passed.

## Environment note

- The default `.env.worktree.local` points integration URLs to `127.0.0.1:15432`.
- `infra:up:migrate` on the detected `local` backend provisioned PostgreSQL through the local socket/peer-auth flow (`localhost` + `host=/var/run/postgresql`, effective port `5432`).
- Because of that mismatch, the new L3 test was rerun with explicit `DATABASE_URL` / `TEST_DATABASE_URL` overrides matching the real provisioned backend.

## Acceptance criteria audit

- AC `joueur non paye ou revoque ne rejoint pas le lobby`: verified by tightened access gate and API unit/L3 tests.
- AC `refresh/reconnect conserve presence/ready/groupe sans doublon`: existing idempotent present/ready behavior preserved and covered by API tests; no duplicate lobby state introduced by this diff.
- AC `timer/rappel n'active jamais la partie`: preserved; confirm-start still locks preparation only and tests keep `status !== ROUND_ACTIVE`.
- AC `admin voit les absents et confirme explicitement avant lancement`: preserved by existing confirm-start path and L3 test.
- AC `groupe, invitation, message et signalement respectent RBAC/rate limits/moderation`: only baseline-safe UI messaging was adjusted in this lot; no unsupported fake chat/groups behavior remains in the room shell.

---
## Step Complete
**Status:** ✓ Complete
**Typecheck:** ✓
**Lint:** ✓
**Tests:** ✓
**Next:** step-05-examine.md
