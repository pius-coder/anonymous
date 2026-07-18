# Step 01: Analyze

**Task:** SEQ-02 - Baseline persistence, seed et integration PostgreSQL
**Started:** 2026-07-16T13:07:22Z
**Completed:** 2026-07-16T13:20:00Z

---

## Codebase Context

### Related Files Found

| File                                                               | Lines / scope          | Contains                                                       |
| ------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`                                 | 1–427                  | 21 models, no enums; ScoreReview + DeliveryLog present         |
| `packages/db/prisma/seed.ts`                                       | 1–18                   | No-op stub (logs only)                                         |
| `packages/db/prisma/migrations/**`                                 | 7 folders              | Empty-DB init + auth + participation + payment + live + rounds |
| `packages/db/src/repositories/*.ts`                                | 11 modules             | Public repos; no ScoreReview/DeliveryLog ops                   |
| `packages/db/src/__tests__/**`                                     | 5 test files + helpers | Export/unit + mocked payment/realtime; no L3 labels            |
| `packages/db/ARCHITECTURE.md`                                      | 1–52                   | Layer rules: no Prisma as network contract                     |
| `docs/06-roadmap/apex-tasks/sequential/SEQ-02-persistence-seed.md` | full                   | Exact deliverables / AC                                        |
| `docs/04-layers/persistence.md`                                    | full                   | Ownership Prisma/migrations/repos                              |
| `docs/05-workflows/database-change.md`                             | full                   | 7-step DB change workflow                                      |
| `docs/05-workflows/test-strategy.md`                               | L0–L6                  | L3 = real PostgreSQL                                           |
| `docs/05-workflows/test-commands.md`                               | harness                | `infra:up`, `test:integration`, worktree isolation             |
| `tests/integration/l3-postgres.smoke.test.ts`                      | monorepo smoke         | SELECT 1 + migrations + User table only                        |
| `packages/contracts/**`                                            | SEQ-01 freeze          | 12 services / 57 methods; compliance proto-only                |

### Patterns Observed

- **Repositories**: thin Prisma wrappers; return `@prisma/client` entity types; input DTOs in `types.ts`.
- **Claim concurrent**: `roundRepository.claimDueRoundDeadline` uses `updateMany` with filters (`closedAt: null`, `deadlineAt <= now`, round `ACTIVE`) → `count === 1`.
- **Idempotence payments**: `createWalletDebitPayment` / `settlePaymentWebhook` with `Serializable` + unique `idempotencyKey`.
- **Duplicate Announcement API**: both `announcementRepository` and `notificationRepository` expose create/list announcement.
- **Status/role**: free strings in DB; proto enums live in contracts only (not SEQ-02 ownership).
- **Tests**: package tests mock prisma; helpers `isIntegrationEnv` / `getTestPrisma` exist but unused.
- **Seed**: not deterministic; re-run does nothing.

### Schema inventory (21 models)

Identity: User, AuthSession, PasswordResetToken, RoleAssignment
Party/live: Party, PartyParticipation, RealtimeConnection
Rounds: Round, RoundParticipant, PlayerAction, RoundDeadline
Scoring: ProvisionalScore, PublishedScore, **ScoreReview**
Audit: AuditLog
Notifications: Announcement, NotificationJob, **DeliveryLog**
Payments: Wallet, PaymentTransaction, LedgerEntry

**No** ComplianceGate / Incident / RiskSignal / AntiCheatEvent tables.

### Repository gaps vs SEQ-02

| Model               | Schema | Repository ops         |
| ------------------- | ------ | ---------------------- |
| ScoreReview         | Yes    | **Missing**            |
| DeliveryLog         | Yes    | **Missing**            |
| Announcement        | Yes    | Present (2 places)     |
| Compliance/Incident | No     | N/A (deferred per AC3) |

### Utilities Available

- `getPrisma()` / `prisma` singleton (`src/prisma.ts`)
- `isIntegrationEnv()`, `getTestPrisma()` (`src/__tests__/helpers.ts`)
- Root harness: `pnpm infra:up`, `pnpm infra:up:migrate`, `TEST_DATABASE_URL`
- Docker Postgres 16 + Redis 7 (`docker-compose.yml`)

### Similar Implementations

- Payment mock L1 tests: `payment.repository.test.ts` — pattern to keep as L1 or complement with L3
- Round claim: `round.repository.ts:155–174` — target for concurrent L3 proof
- Monorepo L3 smoke: `tests/integration/l3-postgres.smoke.test.ts` — pattern for real PG client + env URL

### Test Patterns (current)

- Vitest node, no L1/L2/L3 naming inside package
- `vi.mock("../prisma.js")` for payment + realtime
- Export surface tests only for most repos

## Documentation Insights

### Required reads completed

- AGENTS.md ownership rules
- Gap analysis: seed empty; ScoreReview/DeliveryLog incomplete; no PG tests
- Sprints 03 (persistence), 13 (ScoreReview), 17 (DeliveryLog chain), 18 (compliance deferred fields)
- `database-change.md`, `persistence.md`, contracts layer (no Prisma export)
- SEQ-00 harness + SEQ-01 freeze (no schema ownership)

### Compliance/incidents decision input

Sprint 18 names models but **does not fix concrete field/retention schemas** for v0.1 baseline. SEQ-02 AC3: only add if use cases fix fields/retention → **do not add** ComplianceGate/Incident tables in SEQ-02.

### Context7 libraries used

| Library | ID                   | Relevance                                                  |
| ------- | -------------------- | ---------------------------------------------------------- |
| Prisma  | `/prisma/web`        | seed upsert, `$transaction` / Serializable, migrate deploy |
| Vitest  | `/vitest-dev/vitest` | `describe.skipIf`, concurrent, forks pool, cleanup hooks   |

Key patterns from docs:

- Deterministic seed via `upsert` on unique keys + empty `update: {}` for idempotent re-run
- `prisma migrate deploy` for empty/prod DBs without reset
- L3 suites gated by `describe.skipIf(!DATABASE_URL)` when URL missing (local unit still runs)
- Concurrent claim: race two `updateMany` claims; only one wins

## Research Findings

### Common Approaches

1. **Seed twice**: upsert by stable emails/codes; second run updates nothing destructive or re-affirms same IDs/counts
2. **ScoreReview ops**: create review + update provisional status/score in one transaction when action is correction
3. **DeliveryLog ops**: create log rows under NotificationJob; keep Announcement separate (no merge)
4. **No schema change** if ScoreReview/DeliveryLog already exist — only repository + seed + L3 tests
5. **Migration**: only create new migration if schema changes; applied migrations never edited

### Out of scope (confirmed)

- Proto/codegen, Turbo/CI root packages
- API use-cases, game-server, worker, web
- Exposing Prisma entities as network contracts
- Compliance/incident tables without fixed retention/fields

## Inferred Acceptance Criteria

- [ ] AC1: Deterministic seed creates roles admin/support/finance, 2 players, published party, participations, wallet, minimal auth/lobby/live/scoring data
- [ ] AC2: Seed twice has defined non-destructive behavior (upsert / stable keys)
- [ ] AC3: ScoreReview repository operations without duplicating Announcement
- [ ] AC4: DeliveryLog repository operations without duplicating Announcement
- [ ] AC5: No new compliance/incident models (fields/retention not fixed in use cases)
- [ ] AC6: Migrations work on empty DB; no edit of applied migrations
- [ ] AC7: L3 tests on real PostgreSQL: repos, transactions, constraints, idempotence, concurrent claim
- [ ] AC8: Mock tests renamed L1/L2 or replaced by L3
- [ ] AC9: No Prisma entity as network contract (repos stay in `@session-jeu/db` only)
- [ ] AC10: Validation: docs, prisma generate, L3, db tests, typecheck, lint, build, `git diff --check`

---

## Step Complete

**Status:** ✓ Complete
**Files analyzed:** ~40
**Patterns identified:** 8
**Context7 IDs:** `/prisma/web`, `/vitest-dev/vitest`
**Next:** step-02-plan.md
**Timestamp:** 2026-07-16T13:20:00Z
