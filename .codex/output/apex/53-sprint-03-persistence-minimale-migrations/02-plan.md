# Step 02: Plan

**Task:** sprint 03 - persistence minimale migrations
**Started:** 2026-07-15T09:03:48Z

---

## Planning Progress

## Implementation Plan

### Overview

Keep sprint 03 additive and persistence-focused: add explicit durable idempotency fields for payment transactions and ledger entries, wire repositories/use cases to them, and validate schema/migration/test gates. Do not implement full sprint 07 payment behavior.

### File Changes

#### `packages/db/prisma/schema.prisma`

- Add optional unique `idempotencyKey` to `PaymentTransaction`.
- Add optional unique `idempotencyKey` to `LedgerEntry`.
- Keep `reference` as provider/external reference and do not repurpose it as the idempotency source.

#### `packages/db/prisma/migrations/20260715101000_payment_idempotency/migration.sql` (new)

- Add nullable `idempotencyKey` columns to `PaymentTransaction` and `LedgerEntry`.
- Add unique indexes for both idempotency keys.
- No destructive migration or backfill required.

#### `packages/db/src/repositories/types.ts`

- Add `idempotencyKey?: string` to `CreatePaymentTransactionData`.
- Keep existing `CreateLedgerEntryFullData.idempotencyKey`.

#### `packages/db/src/repositories/payment.repository.ts`

- Persist `idempotencyKey` when creating payment transactions.
- Persist `idempotencyKey` when creating full ledger entries.
- Add `findTransactionByIdempotencyKey`.
- Add `findLedgerEntryByIdempotencyKey`.

#### `packages/db/src/__tests__/payment.repository.test.ts` (new)

- Mock `prisma` and verify payment idempotency fields are written.
- Verify unique-idempotency lookups use `findUnique`.
- Verify ledger idempotency is written/read independently of transaction reference.

#### `packages/db/src/__tests__/repositories.test.ts`

- Assert the new payment repository exports.

#### `apps/api/src/use-cases/payment/payment.use-case.ts`

- Replace idempotency lookup by `reference` with `findTransactionByIdempotencyKey`.
- Pass `idempotencyKey` into `createPaymentTransaction`.
- Pass `idempotencyKey` into wallet ledger creation.
- Keep public response shape unchanged.

### Testing Strategy

- Run `pnpm --filter @session-jeu/db exec prisma validate --schema prisma/schema.prisma`.
- Run `pnpm --filter @session-jeu/db exec prisma generate --schema prisma/schema.prisma`.
- Run `pnpm --filter @session-jeu/db exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.
- Run targeted DB/API checks, then global `docs:check`, `typecheck`, `lint`, `test`, `build`.

### Acceptance Criteria Mapping

- AC-03-04: explicit unique idempotency keys on payment transaction and ledger persistence.
- AC-03-01/02/03/07: existing party/participation/audit persistence remains unchanged and covered by schema constraints/tests.
- AC-03-05/06: no new observer/job behavior is introduced; existing draft notification/realtime tables remain persistence anchors for later sprints.

### Risks

- Existing dirty sprint-07 API code is being aligned to the DB key; full finance transactional behavior remains sprint 07 scope.
- Historical migrations are not squashed; the new migration is additive to avoid rewriting prior dirty user work.

## Step Complete

**Status:** Complete
