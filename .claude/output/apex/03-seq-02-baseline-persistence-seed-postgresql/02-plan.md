# Step 02: Plan

**Task:** SEQ-02 - Baseline persistence, seed et integration PostgreSQL
**Started:** 2026-07-16T13:20:00Z

---

## Implementation Plan: SEQ-02 Baseline persistence

### Overview

Stabilize `packages/db` as the sole Prisma owner: complete ScoreReview/DeliveryLog repository operations (without touching Announcement ownership), ship a deterministic upsert seed, strengthen L3 PostgreSQL tests for constraints/transactions/idempotence/concurrent claim, label existing mock tests L1, and avoid schema changes unless proven necessary. No API/UI/proto work.

### Prerequisites

- [x] SEQ-00 / SEQ-01 baselines present
- [x] Context7 Prisma + Vitest consulted
- [ ] Real PostgreSQL available via `DATABASE_URL` / `TEST_DATABASE_URL` or `pnpm infra:up:migrate`

### Decisions (auto_mode)

| Decision                   | Choice                                                                                                                                                                                                               | Rationale                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Schema migrations          | **None unless gap found**                                                                                                                                                                                            | ScoreReview + DeliveryLog already in 0000_init |
| Compliance/Incident models | **Do not add**                                                                                                                                                                                                       | Sprint 18 does not fix fields/retention        |
| Announcement               | Keep `announcementRepository`; remove duplicate create/list from notification repo OR leave thin re-export comment — prefer **keep announcement repo only for Announcement; notification repo only Job+DeliveryLog** |
| Seed re-run                | **Upsert by stable emails/codes**                                                                                                                                                                                    | Context7 + AC “seed twice defined behavior”    |
| Seed passwords             | Fixed bcrypt-compatible hash string or placeholder hash documented for demo only                                                                                                                                     | Auth tests need passwordHash present           |
| L3 gate                    | `describe.skipIf(!isIntegrationEnv())` for L3 files; L1 always run                                                                                                                                                   | Unit CI without PG still green                 |
| Prisma as network contract | No change to contracts; repos stay package-private API                                                                                                                                                               | AC9                                            |
| Concurrent claim           | Race two `claimDueRoundDeadline` on same due deadline                                                                                                                                                                | Existing API                                   |

---

### File Changes

#### `packages/db/src/repositories/types.ts`

- Add `CreateScoreReviewData`: provisionalScoreId, reviewedBy, action, reason?, previousScore?, newScore?
- Add `CreateDeliveryLogData`: jobId, channel, status, error?, deliveredAt?
- Add `ListDeliveryLogsFilter` / `ListScoreReviewsFilter` if useful (skip/take, provisionalScoreId, jobId)

#### `packages/db/src/repositories/score.repository.ts`

- Add `createScoreReview(data)` → insert ScoreReview
- Add `listScoreReviewsByProvisional(provisionalScoreId)`
- Add `createScoreReviewAndUpdateProvisional(data)` optional transaction: create review + update provisional score/status/reviewedBy/reviewedAt when action is CORRECT/APPROVE (keep thin; no domain rules beyond persistence)
- Do **not** touch Announcement

#### `packages/db/src/repositories/notification.repository.ts`

- Add `createDeliveryLog(data)`
- Add `listDeliveryLogsByJob(jobId)`
- Add `listDeliveryLogsByStatus(status)` if needed for smoke
- **Remove** `createAnnouncement` / `listAnnouncementsByParty` from this file (duplicate of announcement.repository) to satisfy “sans dupliquer Announcement”
- Keep NotificationJob ops

#### `packages/db/src/repositories/index.ts`

- Ensure score + notification exports pick up new functions (namespace export already covers)

#### `packages/db/src/__tests__/repositories.test.ts`

- Assert new ScoreReview + DeliveryLog function exports
- Drop announcement expectations on notificationRepository if removed
- Label suite `L1 repository export surface`

#### `packages/db/prisma/seed.ts` (MAJOR)

Deterministic upsert seed:

Stable identities:

| Key     | Email / code         | Roles / role                                                         |
| ------- | -------------------- | -------------------------------------------------------------------- |
| admin   | `admin@seed.local`   | ADMIN                                                                |
| support | `support@seed.local` | SUPPORT                                                              |
| finance | `finance@seed.local` | FINANCE                                                              |
| player1 | `player1@seed.local` | PLAYER                                                               |
| player2 | `player2@seed.local` | PLAYER                                                               |
| party   | code `SEED-PARTY-01` | status `SCHEDULED` or `PREPARATION_OPEN` (published catalogue-ready) |

Data graph:

1. Users (upsert email) + RoleAssignment (upsert userId+role)
2. AuthSession for admin + player1 (stable token hashes/values documented as seed-only)
3. Party upsert by code; visibility public; roundProgram minimal JSON
4. PartyParticipation for both players (status CONFIRMED/REGISTERED as used elsewhere)
5. Wallet for both players (balance fixed e.g. 1000 XAF) + optional one SUCCESSFUL payment+ledger with idempotency keys `seed-wallet-p1` / `seed-wallet-p2`
6. Round #1 minigame `memory_sequence`, status SETUP or WAITING_REVIEW
7. RoundParticipant for both; optional RoundDeadline
8. ProvisionalScore both; one ScoreReview sample; one PublishedScore if status published path for scoring demo — prefer provisional + one published for player1 to support scoring smoke
9. Announcement one row; NotificationJob PENDING; DeliveryLog SENT sample (separate models)
10. RealtimeConnection for player1 (tokenHash seed-stable)
11. AuditLog one admin action sample

Second run: upserts only; log counts; exit 0; no orphan payments.

#### `packages/db/src/__tests__/helpers.ts`

- Prefer `TEST_DATABASE_URL` over `DATABASE_URL` when both set
- Add `requireIntegrationEnv()` throw helper
- Add `cleanupSeedLikeFixtures` or truncate strategy for L3: **deleteMany in FK-safe order** for test-created rows (prefix emails/codes `l3-` to avoid clobbering seed)
- `withTestClient()` using datasources URL override like monorepo smoke

#### `packages/db/src/__tests__/payment.repository.test.ts`

- Rename describe to `L1 paymentRepository (mocked prisma)`
- Keep existing mock tests

#### `packages/db/src/__tests__/realtime.repository.test.ts`

- Rename describe to `L1 realtimeRepository (mocked prisma)`

#### `packages/db/src/__tests__/index.test.ts` / `prisma.test.ts`

- Label L1

#### `packages/db/src/__tests__/l3-repositories.integration.test.ts` (NEW)

Gate: `describe.skipIf(!isIntegrationEnv())`

Suites:

1. **Constraints**: unique email, unique party code, unique (partyId,userId) participation, unique actionNonce, unique payment idempotencyKey
2. **Transactions**: wallet debit serializable path via `createWalletDebitPayment`; insufficient balance
3. **Idempotence**: double debit same key → same balance; double seed upsert smoke via repository upserts or calling seed logic
4. **Concurrent claim**: setup ACTIVE round + due RoundDeadline; `Promise.all` two `claimDueRoundDeadline`; exactly one true
5. **ScoreReview**: create review + list
6. **DeliveryLog**: create under job + list; Announcement create stays on announcementRepository only
7. **Smoke graph**: create user→party→participation→round→provisional→publish minimal path

Cleanup after each test or afterAll with deleteMany order.

#### `packages/db/src/__tests__/l3-seed.integration.test.ts` (NEW)

- Run seed main logic twice against real DB (import seed functions if exported, or spawn `tsx` — prefer **export `runSeed(prisma)`** from seed.ts for testability)
- Assert stable counts for seed emails/code
- Assert second run does not double wallets/participations

#### `packages/db/prisma/schema.prisma`

- **No change expected**
- If seed/tests reveal missing unique needed for upsert (e.g. nothing), only then add migration — currently email + party code + composites suffice

#### `packages/db/prisma/migrations/**`

- **Do not edit** applied migrations
- New migration only if schema change

#### `packages/db/ARCHITECTURE.md`

- Document seed contents, L1 vs L3 test layout, public repo surface includes ScoreReview/DeliveryLog
- Explicit: Prisma entities not network contracts

#### `docs/00-audit/v0.1-current-state.md` / gap analysis (light touch if needed)

- Update persistence row: seed + L3 present after execute
- Only if project convention updates audit on SEQ completion — prefer minimal doc update in ARCHITECTURE + SEQ-02 validate note; update gap if currently claiming seed empty

#### Out of ownership (FORBIDDEN)

- packages/contracts, apps/*, turbo, CI, root package.json scripts (use existing)

---

### Testing Strategy

| Level    | File                                                   | Content                                                     |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| L1       | existing mocked + export tests                         | renamed                                                     |
| L3       | `l3-repositories.integration.test.ts`                  | constraints, tx, idempotence, claim, score review, delivery |
| L3       | `l3-seed.integration.test.ts`                          | double seed                                                 |
| Monorepo | existing `tests/integration/l3-postgres.smoke.test.ts` | still green                                                 |

Commands (validate):

```bash
pnpm --filter @session-jeu/db db:generate
# empty DB migrate
DATABASE_URL=... pnpm --filter @session-jeu/db exec prisma migrate deploy
DATABASE_URL=... pnpm --filter @session-jeu/db db:seed  # twice
DATABASE_URL=... TEST_DATABASE_URL=... pnpm --filter @session-jeu/db test
pnpm typecheck && pnpm lint && pnpm build
git diff --check
pnpm docs:check  # if exists
```

---

### Acceptance Criteria Mapping

- [ ] AC1 Seed data graph → `seed.ts`
- [ ] AC2 Seed twice → upsert + `l3-seed.integration.test.ts`
- [ ] AC3 ScoreReview ops → `score.repository.ts` + L3
- [ ] AC4 DeliveryLog ops → `notification.repository.ts` + L3
- [ ] AC5 No compliance models → no schema addition
- [ ] AC6 Migrations empty DB → deploy validation; no edit applied
- [ ] AC7 L3 repos/tx/constraints/idempotence/claim → new L3 files
- [ ] AC8 Mock tests L1 named → renames
- [ ] AC9 No Prisma network contract → package boundary + ARCHITECTURE
- [ ] AC10 Full validation suite → step-04

---

### Risks & Considerations

| Risk                                                | Mitigation                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| L3 fails without PG                                 | skipIf + document; validate with infra:up                        |
| Seed collides with L3 data                          | L3 uses `l3-` prefix emails/codes                                |
| Removing notification.announcement breaks consumers | grep usages before remove; re-export from announcement if needed |
| Serializable flaky under load                       | keep existing payment path; L3 single-process                    |
| Double seed password sessions                       | upsert tokens or delete+recreate sessions carefully              |

### Dependency order

1. types + score/notification repos
2. seed export `runSeed`
3. helpers L3
4. L1 renames + export tests
5. L3 tests
6. ARCHITECTURE / light audit docs
7. Validate migrate/seed/tests

---

## Step Complete

**Status:** ✓ Complete
**Files planned:** ~12
**Tests planned:** 2 new L3 + renames
**Auto-approved:** true
**Next:** step-03-execute.md
**Timestamp:** 2026-07-16T13:22:00Z
