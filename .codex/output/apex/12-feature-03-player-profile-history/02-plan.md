# Step 02: Plan

**Task:** Feature 03 player profile history
**Started:** 2026-07-08T10:38:47Z

---

## Planning Progress

_Implementation plan will be written here..._

### Overview

Add a backend-only Feature 03 slice: extend player profiles with public visibility/preferences, persist derived stat snapshots, expose protected player profile/history/stats routes, expose a sanitized public profile route, and recompute stats after admin result finalization.

Decision: `GET /v1/players/:publicId` will resolve `publicId` as the existing unique `PlayerProfile.username`. This avoids adding a second public identifier while satisfying the public profile contract.

### File Changes

#### `packages/db/prisma/schema.prisma`
- Add `statsSnapshot PlayerStatsSnapshot?` relation on `User`.
- Extend `PlayerProfile` with `avatarUrl`, `preferences`, and `isPublic`.
- Add `PlayerStatsSnapshot` with unique `userId`, sessions played/won, win rate, average rank, credits won XAF, and `computedAt`.

#### `packages/db/prisma/migrations/20260708100000_feature_03_player_profile_history/migration.sql` (new)
- Add nullable/defaulted profile columns.
- Create `PlayerStatsSnapshot` table with FK to `User`.
- Add required indexes/unique constraints.

#### `packages/db/src/__tests__/index.test.ts`
- Assert Prisma exposes `playerProfile` and `playerStatsSnapshot`.

#### `apps/api/src/players/playerProfile.ts` (new)
- Define profile/history params and PATCH/query schemas.
- Validate username format as `400_INVALID_NICKNAME`.
- Implement private profile get-or-create, PATCH with duplicate username handling, audit log for username/avatar/visibility changes.
- Implement derived stats recomputation from `GameResult` and prize `LedgerEntry`.
- Implement paginated current-user history from `SessionRegistration` and related `GameSession`/`GameResult` data.
- Implement public profile lookup and sensitive-field-safe serializers.

#### `apps/api/src/routes/players.ts` (new)
- Mount protected `GET /players/me`, `PATCH /players/me`, `GET /players/me/history`, `GET /players/me/stats`.
- Mount public `GET /players/:publicId`.
- Map business errors to `400_INVALID_NICKNAME`, `409_NICKNAME_TAKEN`, `404_PLAYER_NOT_FOUND`; private profiles return 404 to reduce enumeration.

#### `apps/api/src/index.ts`
- Import and mount the new router under `/v1`.

#### `apps/api/src/routes/admin/results.ts`
- After successful finalization, call session-level stats recomputation before scheduling credits distribution response completes.

#### Tests
- `apps/api/src/players/__tests__/playerProfile.test.ts`: unit tests for stats derivation and snapshot upsert source data.
- `apps/api/src/routes/__tests__/players.test.ts`: integration-style route tests for auth, GET/PATCH, duplicate nickname, history ownership, and public privacy.

### Acceptance Criteria Mapping

- Private profile GET/PATCH: `apps/api/src/routes/players.ts`, `apps/api/src/players/playerProfile.ts`, route tests.
- History filtered by owner and paginated: `listPlayerHistory`, route tests.
- Derived stats from official results/ledger: `recomputePlayerStats`, unit tests, Prisma snapshot.
- Public profile privacy: `getPublicPlayerProfile`, route tests.
- Recompute after finalization: `apps/api/src/routes/admin/results.ts`.

### Validation

- `pnpm --filter @session-jeu/db prisma:format`
- `pnpm --filter @session-jeu/db prisma:validate`
- `pnpm --filter @session-jeu/db prisma:generate`
- Focused API/DB tests, then `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
