# Step 03: Execute

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Implementation Log

### Implemented

- Added `packages/shared/src/auth/tokens.ts` with `hashOpaqueToken`, then re-used it from API auth/live and
  game-server live auth.
- Added game-server dependency on `@session-jeu/shared` and refreshed the workspace install offline.
- Changed live access creation to return the raw token once while storing only `tokenHash`.
- Renamed realtime repository lookup to `findByTokenHash`.
- Added migration `20260715113000_live_token_hash` to rename the live token column and indexes.
- Rejected player registration for `DRAFT` parties.
- Added `overrideReason` to admin preparation confirm-start and reject absent overrides without it.
- Added `createWalletDebitPayment` and `settlePaymentWebhook` repository methods using serializable
  Prisma transactions.
- Updated payment use-cases to call the transactional repository operations and map stable errors.
- Added focused tests for shared token hashing, DB realtime lookup, DB finance transactions, API payment,
  participation draft refusal, preparation absent confirmation and game-server token hash lookup.
