# Step 04: Validate

**Task:** sprint 01 - modele produit et domaine
**Started:** 2026-07-15T08:41:21Z

---

## Validation Progress

_Validation results will be appended here..._

## Commands

- `pnpm docs:check` -> passed.
- `pnpm --filter @session-jeu/game-engine typecheck` -> passed.
- `pnpm --filter @session-jeu/game-engine lint` -> passed.
- `pnpm --filter @session-jeu/game-engine test` -> passed, 10 test files, 128 tests.
- `pnpm typecheck` -> passed, 12 Turbo tasks successful.
- `pnpm lint` -> passed, 12 Turbo tasks successful.
- `pnpm test` -> passed, 12 Turbo tasks successful.
- `pnpm build` -> passed, 9 Turbo tasks successful.

## Acceptance Criteria

- AC-01-01: existing `schedule` transition remains tested.
- AC-01-02: existing forbidden `Scheduled -> RoundActive` remains tested.
- AC-01-03: existing `markReady` participation transition remains tested.
- AC-01-04: existing invalid participation start from invited remains tested.
- AC-01-05: observer projection remains deferred to contract/realtime sprints; no private projection was added here.
- AC-01-06: `round-transitions.test.ts` proves `Active -> Closing` and forbids direct publish.
- AC-01-07: `score-transitions.test.ts` proves publication requires `Verified` and throws `SCORE_NOT_VERIFIED` otherwise.

## Residual Risks

- `GameStatus` still uses legacy CamelCase enum names for compatibility with existing API worktree changes; canonical lifecycle mapping is documented from sprint 00.
- Audience projection no-leak is not fully implemented in domain because sprint 09 owns state views and contracts.

---
## Step Complete
**Status:** ✓ Complete
**Typecheck:** ✓
**Lint:** ✓
**Tests:** ✓
**Build:** ✓
**Docs:** ✓
**Next:** step-07-tests.md
**Timestamp:** 2026-07-15T10:22:00Z
