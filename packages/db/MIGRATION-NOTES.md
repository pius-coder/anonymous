# P-SEQ-03 — Migration notes (production data)

## Migration id

`20260717120000_production_data`

## Expand / contract strategy

This release is **expand-only**:

1. **Expand**: add enums, nullable columns, new tables, partial unique indexes.
2. **Migrate data**: map free-string `PaymentTransaction.status` → `PaymentStatus` enum;
   backfill `internalStatus`, ledger `walletId` / `direction` / `balanceAfter`.
3. **Contract** (future P-SEQ-03 pass only): drop obsolete free-string usages after all
   consumers read enum columns; never edit this migration after apply.

Business lots must **not** alter `schema.prisma` directly. Schema changes return as a new
P-SEQ-03 additive migration and revalidate descendant lots.

## Forward paths

### Empty database

```bash
pnpm --filter @session-jeu/db exec prisma migrate deploy
# applies 0000_init … 20260717120000_production_data in order
```

### Upgrade from current baseline (post round_orchestration)

```bash
pnpm --filter @session-jeu/db exec prisma migrate deploy
# applies only 20260717120000_production_data
```

## Rollback (documented reverse — not auto via migrate)

Prisma Migrate does not ship automatic down migrations. Manual reverse (contract phase):

1. Drop FKs introduced in this migration.
2. Drop new tables: `ProviderWebhookInbox`, `PaymentReconciliation`, `EncryptionKey`,
   `EncryptedSecret`, `RoundCheckpoint`, `ScoreEvidence`, `TeamAssignment`, `TeamMember`,
   `PairAssignment`, `MinigameManifest`, `ComplianceGate`, `Incident`, `SupportAccessGrant`,
   `ConsentRecord`, `RetentionPolicyRule`, `ProviderCredentialRef`.
3. Drop new columns on Party, PartyParticipation, Round, ProvisionalScore, PublishedScore,
   AuditLog, NotificationJob, Wallet, PaymentTransaction, LedgerEntry.
4. Convert `PaymentTransaction.status` back to TEXT if required by a hotfix branch.
5. Drop enums created in this migration.

Prefer **forward fix** migrations over destructive rollback in production.

## Constraints verified on real PostgreSQL (L3)

| Constraint | Purpose |
|------------|---------|
| Partial unique `providerTransId` / `providerExternalId` | Fapshi id idempotency |
| Unique `(provider, externalEventId)` webhook inbox | Webhook replay safety |
| Unique `NotificationJob.idempotencyKey` | No double enqueue |
| Serializable `tryRegisterWithCapacity` + `FOR UPDATE` | Last-seat race |
| Serializable score publish + prize ledger | Atomic gains + audit |
| Unique `(roundId, version)` checkpoint | Ordered recovery |

## Seed production guard

- `runSeed` / CLI call `assertSeedAllowed()` → throws if `APP_ENV` is `production` or `staging`.
- `scripts/lib/seed-lock.mjs` also forbids seed in those environments.
- Seed never prints passwords, tokens, or API key values (ARCHITECTURE docs local-only demo password).
