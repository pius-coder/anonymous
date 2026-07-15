# Step 07: Tests

**Task:** sprint 01 - modele produit et domaine
**Started:** 2026-07-15T08:41:21Z

---

## Test Analysis and Creation

_Test strategy and implementation will be documented here..._

## Test Infrastructure

- Test framework: Vitest.
- Package command: `pnpm --filter @session-jeu/game-engine test`.
- Existing pattern: colocated `src/__tests__/*.test.ts` files with `describe/it/expect`.

## Tests Created / Updated

- `packages/game-engine/src/__tests__/round-transitions.test.ts`: covers round lifecycle, forbidden direct publish, immutability.
- `packages/game-engine/src/__tests__/score-transitions.test.ts`: covers verified-before-publish, `SCORE_NOT_VERIFIED`, immutable score transitions.
- `packages/game-engine/src/__tests__/errors.test.ts`: adds stable error code test for `ScoreNotVerifiedError`.
- `packages/game-engine/src/__tests__/index.test.ts`: verifies public exports for round transitions and `verifyScore`.

## AC Mapping

- AC-01-06 -> `round-transitions.test.ts`.
- AC-01-07 -> `score-transitions.test.ts` and `errors.test.ts`.

---
## Step Complete
**Status:** ✓ Complete
**Tests created:** 2 new files, 2 updated files
**Next:** step-08-run-tests.md
**Timestamp:** 2026-07-15T10:23:00Z
