# Step 01: Analyze

**Task:** sprint 03 - persistence minimale migrations
**Started:** 2026-07-15T09:03:48Z

---

## Context Discovery

## Mandatory Inspection

- `pwd`: `/home/afreeserv/anonymous`
- Branch: `v0.1`
- Worktree: dirty before sprint 03; sprint 00-02 changes and pre-existing API/DB/realtime work remain present and must not be reverted.
- Root manifest: `package.json` exposes `docs:check`, `typecheck`, `lint`, `test`, `build`, and DB scripts through pnpm/turbo.
- DB manifest: `packages/db/package.json` uses Prisma `^6.0.0`, `@prisma/client`, TypeScript and Vitest.

## Docs Read

- `docs/06-roadmap/sprints/03-persistence-minimale-migrations.md`
- `docs/06-roadmap/sprints/07-paiements-wallet-ledger.md`
- `docs/03-architecture/data-model.md`
- `docs/03-architecture/uml/data-flow.md`
- `docs/03-architecture/uml/domains.md`
- `docs/04-layers/persistence.md`
- `docs/04-layers/application-use-cases.md`
- `docs/05-workflows/database-change.md`
- `docs/05-workflows/test-strategy.md`
- `packages/db/ARCHITECTURE.md`

## Context7 Evidence

- `/prisma/prisma`: Prisma migrations can be created/applied with `migrate dev`; composite unique constraints are declared with `@@unique(...)` and queried with generated compound keys; interactive transactions support isolation options such as `Serializable`.
- `/prisma/prisma`: Prisma `$transaction` patterns can roll back on thrown errors; this is the current official route for durable financial/idempotency operations once sprint 07 implements the full behavior.

## Existing DB Surface

- `packages/db/prisma/schema.prisma` already contains identity, party, participation, realtime, rounds, scoring, audit, notifications, wallet, payment, and ledger models.
- `PartyParticipation` has `@@unique([partyId, userId])` and optional unique `idempotencyKey`, satisfying the durable participation uniqueness anchor.
- `RealtimeConnection` has one row per participation and unique `accessToken`, supporting the sprint 09 live-access work already present in the dirty worktree.
- `PaymentTransaction` has `reference` but no `idempotencyKey` field or unique idempotency constraint.
- `LedgerEntry` has unique `transactionId`, but no `idempotencyKey` field despite `packages/contracts/proto/payment/v1/payment.proto` exposing `LedgerEntry.idempotency_key`.
- `packages/db/src/repositories/types.ts` already declares `CreateLedgerEntryFullData.idempotencyKey`, but `payment.repository.ts` ignores it.
- `apps/api/src/use-cases/payment/payment.use-case.ts` currently uses `findTransactionByReference(input.idempotencyKey)` to implement payment/wallet idempotency, but `reference` is not unique and is also overwritten with provider references during webhooks/reconciliation.

## Validation Baseline

- `pnpm --filter @session-jeu/db exec prisma validate --schema prisma/schema.prisma`: passed.
- `pnpm --filter @session-jeu/db exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`: passed and rendered an empty-DB SQL script.
- Initial path attempt with `packages/db/prisma/schema.prisma` failed because `pnpm --filter` runs commands from `packages/db`; corrected to `prisma/schema.prisma`.

## Gaps Found

- AC-03-04 requires idempotent wallet/ledger persistence, but DB idempotency is currently a best-effort lookup on a non-unique `reference` column.
- The payment contract already exposes `LedgerEntry.idempotency_key`, but persistence cannot store or enforce it.
- Repository tests currently only assert exports for payment repository functions; they do not verify idempotency fields are persisted or queried through unique keys.

## Step Complete

**Status:** Complete
