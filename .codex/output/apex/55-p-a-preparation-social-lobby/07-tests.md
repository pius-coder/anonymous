# Step 07: Tests

**Task:** P-A-PREPARATION - Lobby social et readiness
**Started:** 2026-07-18T01:20:54Z

---

## Test Analysis and Creation

_Test strategy and implementation will be documented here..._

## Added / updated coverage

- `apps/api/src/use-cases/preparation/__tests__/preparation.use-case.test.ts`
  added free-party access, paid-party unpaid denial, self projection, revoked read denial.
- `apps/api/src/__tests__/preparation-announcement.l3.integration.test.ts`
  added real PostgreSQL coverage for unpaid-player denial on a paid party.

## Not added in this lot

- No new front-end unit test existed around `LobbyPanel` / `RoomExperience`; current repo coverage for this area remains API-focused plus broader browser flows.
- No new game-server integration was added because the lot intentionally avoided `apps/game-server/**` ownership overlap.

---
## Step Complete
**Status:** ✓ Complete
**Next:** step-08-run-tests.md
