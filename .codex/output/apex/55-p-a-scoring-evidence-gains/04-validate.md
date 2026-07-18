# Step 04: Validate

**Task:** P-A-SCORING - Preuves, publication et gains atomiques
**Started:** 2026-07-18T01:23:48Z

---

## Validation Progress

- `scripts/worktree-run pnpm --filter @session-jeu/api exec vitest run src/use-cases/scoring/__tests__/scoring.use-case.test.ts src/use-cases/scoring/__tests__/scoring.l5-flow.test.ts src/routes/__tests__/admin-scoring-rbac.l4.test.ts src/rpc/__tests__/scoring-service.test.ts`
  Result: 4 files passed, 23 tests passed.
- `scripts/worktree-run pnpm lint`
  Result: success after removing one unused API type import and three web warnings.
- `scripts/worktree-run env DATABASE_URL='postgresql://afreeserv@localhost/session_jeu_wt_p_a_scoring?host=/var/run/postgresql&schema=public' TEST_DATABASE_URL='postgresql://afreeserv@localhost/session_jeu_wt_p_a_scoring?host=/var/run/postgresql&schema=public' pnpm --filter @session-jeu/db exec vitest run src/__tests__/l3-score-publish-atomic.integration.test.ts`
  Result: 1 file passed, 1 test passed.
