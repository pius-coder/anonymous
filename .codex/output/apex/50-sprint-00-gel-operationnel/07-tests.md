# Step 07: Tests

**Task:** sprint 00 - gel operationnel
**Started:** 2026-07-15T08:27:06Z

---

## Test Analysis and Creation

_Test strategy and implementation will be documented here..._

## Infrastructure

- Root `package.json`: `test` -> `turbo run test`.
- Workspaces API, DB, contracts, game-engine, shared, worker, whatsapp-gateway, game-server, web: `vitest run`.
- Web also exposes `test:e2e` through Playwright.

## Pattern Analysis

Existing tests are behavior-oriented Vitest files under `src/__tests__` or feature-local `__tests__`.
Relevant examples already present:

- `packages/contracts/src/__tests__/conventions.test.ts`
- `packages/contracts/src/__tests__/golden.test.ts`
- `apps/api/src/routes/__tests__/live.test.ts`
- `apps/game-server/src/__tests__/live-room.integration.test.ts`
- `packages/game-engine/src/__tests__/party-transitions.test.ts`

## Decision

No new runtime or unit test was created for sprint 00 because the implemented change is documentation
hygiene only. The correct test surface is:

- `pnpm docs:check` for documentation structure and links;
- global `typecheck`, `lint`, `test`, `build` to ensure the worktree remains valid;
- cache-bypass Turbo runs for technical validation confidence.

Creating a synthetic Vitest test for wording-only documentation would not verify product behavior and would
violate the local test strategy's anti-false-positive rule.

---
## Step Complete
**Status:** ✓ Complete
**Tests created:** 0
**Test files:** none
**Next:** step-08-run-tests.md
**Timestamp:** 2026-07-15T09:45:00Z
