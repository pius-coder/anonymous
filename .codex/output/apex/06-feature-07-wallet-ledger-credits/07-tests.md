# Step 07: Tests

**Task:** continue sequential implementation with Feature 07 wallet ledger credits
**Started:** 2026-07-08T05:02:31Z

---

## Test Analysis and Creation

Tests added:

- `apps/api/src/wallet/__tests__/wallet.test.ts`
  - Recomputes ledger balance.
  - Wallet debit creates ledger, updates balance, and marks registration paid.
  - Idempotency key prevents double debit.
  - Insufficient funds refuses mutation.
  - Admin adjustment writes audit.
- `apps/api/src/routes/__tests__/wallet.test.ts`
  - Player reads own wallet.
  - Player reads paginated ledger.
  - Player pays registration with wallet.
  - Insufficient funds maps to `409`.
  - Withdrawal endpoint returns `WITHDRAWALS_DISABLED`.
- `apps/api/src/routes/__tests__/admin-wallets.test.ts`
  - Finance can adjust with reason.
  - Reason is required.
  - Non-finance admin is rejected.
