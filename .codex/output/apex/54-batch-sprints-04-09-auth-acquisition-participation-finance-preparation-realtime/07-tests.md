# Step 07: Tests

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Added Or Updated Tests

- `packages/shared/src/__tests__/index.test.ts`: deterministic opaque-token hashing.
- `packages/db/src/__tests__/realtime.repository.test.ts`: `tokenHash` upsert and lookup.
- `packages/db/src/__tests__/payment.repository.test.ts`: idempotency keys, wallet debit transaction,
  insufficient balance, webhook settlement and replay.
- `apps/api/src/use-cases/payment/__tests__/payment.use-case.test.ts`: wallet debit repository delegation,
  insufficient balance mapping, webhook settlement and terminal replay.
- `apps/api/src/use-cases/party/__tests__/participation.use-case.test.ts`: draft registration rejection.
- `apps/api/src/use-cases/preparation/__tests__/preparation.use-case.test.ts`: absent confirmation reason.
- `apps/api/src/routes/__tests__/live.test.ts`: live token hash persisted, raw token returned once.
- `apps/game-server/src/__tests__/live-room.integration.test.ts`: live auth looks up hash, not raw token.
