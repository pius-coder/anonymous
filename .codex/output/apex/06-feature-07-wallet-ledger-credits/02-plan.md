# Step 02: Plan

**Task:** continue sequential implementation with Feature 07 wallet ledger credits
**Started:** 2026-07-08T05:02:31Z

---

## Planning Progress

1. Update Prisma schema and migration for integer wallet balances and ledger idempotency.
2. Export new ledger enums from `@session-jeu/db`.
3. Add wallet domain service for serialization, balance recomputation, reads, wallet debit, and admin adjustment.
4. Add player routes:
   - `GET /v1/wallet/me`
   - `GET /v1/wallet/me/ledger`
   - `POST /v1/registrations/:id/pay-with-wallet`
   - `POST /v1/wallet/me/withdraw`
5. Add admin route:
   - `POST /v1/admin/wallets/:userId/adjust`
6. Add unit/route tests.
7. Run Prisma validation/generation and full repo gates.
