# Implementation Plan: Sprint 7 - Paiements, wallet et ledger

## Overview

Reconstruire le paiement d'accès et les mouvements wallet avec trace uniforme. La couche DB (Prisma schema + repository) et les contrats Protobuf existent déjà. Il faut ajouter: les erreurs partagées, les use cases applicatifs, les routes API, le webhook Fapshi, la reconciliation worker, et les tests.

## Acceptance Criteria

- [ ] AC1: Toute entrée payée est reliée à une PaymentTransaction et, si wallet, à un LedgerEntry
- [ ] AC2: Paiement provider externe avec webhook idempotent
- [ ] AC3: Paiement wallet avec PaymentTransaction provider WALLET + ledger debit/credit
- [ ] AC4: Ledger avec clé d'idempotence
- [ ] AC5: Reconciliation worker idempotent
- [ ] AC6: Admin finance read models
- [ ] AC7: Audit pour ajustements finance
- [ ] AC8: Aucun score/round/resultat ne dépend directement du provider paiement

---

## File Changes

### 1. `packages/shared/src/payments/errors.ts` (NEW FILE)

- Create `PAYMENT_ERRORS` constant map following `auth/errors.ts` pattern
- Codes: `PAYMENT_INITIATION_FAILED`, `PAYMENT_NOT_FOUND`, `PAYMENT_ALREADY_COMPLETED`, `PAYMENT_EXPIRED`, `WALLET_NOT_FOUND`, `WALLET_FROZEN`, `INSUFFICIENT_BALANCE`, `LEDGER_ENTRY_NOT_FOUND`, `DUPLICATE_IDEMPOTENCY_KEY`, `INVALID_AMOUNT`, `PROVIDER_ERROR`, `WEBHOOK_SIGNATURE_INVALID`

### 2. `packages/shared/src/index.ts`

- Add `export * from "./payments/errors.js"`

### 3. `packages/db/src/repositories/payment.repository.ts`

- Add `findTransactionById(id)` - lookup single PaymentTransaction
- Add `findTransactionByReference(reference)` - find by external reference (UNIQUE constraint)
- Add `updateTransactionStatus(id, data)` - update status + optional reference/provider fields
- Add `listAllTransactions(skip, take)` - paginated admin listing
- Add `findWalletWithLock(userId)` - for concurrent-safe balance operations (if Prisma supports $transaction)
- Add `createLedgerEntryFull(data)` - new function with idempotencyKey support
- Add `listLedgerEntriesByUserId(userId)` - for player-facing ledger

### 4. `packages/db/src/repositories/types.ts`

- Add `UpdateTransactionStatusData` type
- Add `CreateLedgerEntryFullData` type with idempotencyKey

### 5. `apps/api/src/use-cases/payment/payment.use-case.ts` (NEW FILE)

- Create `PaymentUseCaseError` class (same pattern as `PartyUseCaseError`)
- `getOrCreateWallet(userId)` - find or create wallet for user
- `initiatePayment(input)` - create PaymentTransaction with provider EXTERNAL, return checkout URL
- `handlePaymentWebhook(input)` - idempotent webhook processing, validates signature, updates transaction
- `payWithWallet(input)` - validate wallet balance, create PaymentTransaction with provider WALLET, debit wallet, create LedgerEntry
- `getPaymentStatus(paymentId)` - return transaction detail
- `listWalletLedger(userId)` - return wallet + recent ledger entries
- `listAllTransactions(input)` - admin listing with pagination
- `reconcilePayment(paymentId)` - admin reconciliation

### 6. `apps/api/src/routes/payment.ts` (NEW FILE)

Following `party.ts` pattern:
- `POST /v1/payments/initiate` - requireAuth, initiate payment
- `POST /v1/payments/webhook/fapshi` - NO auth (signed by provider), webhook handler
- `POST /v1/payments/wallet/pay` - requireAuth, pay with wallet
- `GET /v1/payments/:id/status` - requireAuth, get payment status
- `GET /v1/wallet` - requireAuth, get my wallet + balance
- `GET /v1/wallet/ledger` - requireAuth, list my ledger entries

### 7. `apps/api/src/routes/admin/payment.ts` (NEW FILE)

Following `admin/party.ts` pattern:
- `GET /v1/admin/payments` - requireAuth, requireRole("FINANCE", "ADMIN", "SUPER_ADMIN"), list all
- `GET /v1/admin/payments/:id` - requireFinanceOrAdmin, get single
- `POST /v1/admin/payments/:id/reconcile` - requireFinanceOrAdmin, auditLog, reconcile
- `GET /v1/admin/wallets` - requireFinanceOrAdmin, list wallets

### 8. `apps/api/src/index.ts`

- Import `paymentRouter` from `./routes/payment.js`
- Import `adminPaymentRouter` from `./routes/admin/payment.js`
- Add `app.route("/v1", paymentRouter)` and `app.route("/v1/admin", adminPaymentRouter)`

### 9. `apps/worker/src/jobs/paymentReconciliation.ts` (NEW FILE)

- Create reconciliation worker job
- Query PENDING transactions older than threshold
- Attempt status check with provider
- Update transaction status
- Log reconciliation action

### 10. `apps/worker/src/index.ts`

- Export payment reconciliation job function
- Register job types

---

## Testing Strategy

### New test files:

**`apps/api/src/use-cases/payment/__tests__/payment.use-case.test.ts`**
- InitiatePayment creates transaction with correct data
- PayWithWallet debits correctly and creates ledger entry
- PayWithWallet rejects insufficient balance
- PayWithWallet rejects frozen wallet
- GetPaymentStatus returns correct data
- handlePaymentWebhook is idempotent (replay safe)
- handlePaymentWebhook validates signature
- ListWalletLedger returns entries

**`apps/api/src/routes/__tests__/payment.test.ts`**
- POST /payments/initiate returns 201
- POST /payments/wallet/pay returns 200
- POST /payments/wallet/pay returns 422 when insufficient balance
- GET /payments/:id/status returns 200
- GET /wallet returns 200
- GET /wallet/ledger returns 200

**`apps/api/src/routes/__tests__/admin-payment.test.ts`**
- GET /admin/payments returns 200 for FINANCE role
- POST /admin/payments/:id/reconcile returns 200
- GET /admin/payments/:id returns 200
- GET /admin/payments returns 403 for PLAYER role
- GET /admin/wallets returns 200

**`apps/worker/src/__tests__/paymentReconciliation.test.ts`**
- Reconciliation processes pending transactions

**`packages/shared/src/__tests__/payment-errors.test.ts`**
- Export check for PAYMENT_ERRORS

### Updates to existing tests:

- `packages/db/src/__tests__/repositories.test.ts` - Add tests for new repository functions
- `apps/api/src/__tests__/index.test.ts` - Check payment routes registered

---

## Risks & Considerations

- **Wallet concurrency**: Balance updates via Prisma need `$transaction` with atomic update to prevent race conditions. Use `prisma.wallet.update({ where: { id }, data: { balance: { increment: -amount } } })` with balance >= 0 check.
- **Webhook idempotency**: Use transaction.reference as idempotency key. If transaction already has status SUCCESSFUL, skip processing.
- **No real Fapshi in v0.1**: Provider client should be abstracted behind interface. For now, webhook handler accepts signed payloads but actual HTTP calls to Fapshi API are stubbed.
- **Decimal handling**: Prisma uses Decimal for balance. Use `number` in TS repository layer but be aware of precision.
- **Provider abstraction**: Payment provider (Fapshi) should implement a `PaymentProvider` interface so future providers can be swapped.
