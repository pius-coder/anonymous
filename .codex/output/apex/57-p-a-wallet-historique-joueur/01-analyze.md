# Step 01: Analyze

**Task:** P-A-WALLET - Wallet et historique joueur
**Started:** 2026-07-18T03:40:55Z

---

## Context Discovery

### Project Structure

- Monorepo with `apps/api` (Hono REST + ConnectRPC), `apps/web` (Next.js App Router), `packages/db` (Prisma), `packages/shared`, `packages/contracts` (Protobuf)
- Branch: `v0.1` (integration branch)
- `.codex/output/apex/` has existing tasks up to #56

### Existing Code (Wallet/Ledger — Already Built)

#### Backend (apps/api)

| Route                          | File                    | Purpose                             |
| ------------------------------ | ----------------------- | ----------------------------------- |
| `GET /v1/wallet`               | `routes/payment.ts:140` | Get wallet balance                  |
| `GET /v1/wallet/ledger`        | `routes/payment.ts:150` | List ledger entries (no pagination) |
| `POST /v1/payments/wallet/pay` | `routes/payment.ts:109` | Pay with wallet (ACCESS_FEE)        |
| `GET /v1/payments/:id/status`  | `routes/payment.ts:129` | Check payment status                |

#### Use Cases (apps/api/src/use-cases/payment/)

| Function                   | File:Line                 | Purpose                                          |
| -------------------------- | ------------------------- | ------------------------------------------------ |
| `getOrCreateWallet`        | `payment.use-case.ts:263` | Get or create wallet for user                    |
| `getMyWallet`              | `payment.use-case.ts:716` | Returns wallet detail                            |
| `listMyLedger`             | `payment.use-case.ts:720` | Returns ALL ledger entries (no pagination)       |
| `listMyPayments`           | `payment.use-case.ts:725` | Returns ALL payment transactions (no pagination) |
| `payWithWallet`            | `payment.use-case.ts:608` | Atomic wallet debit + participation admission    |
| `initiatePayment`          | `payment.use-case.ts:276` | Fapshi checkout flow                             |
| `getPaymentStatus`         | `payment.use-case.ts:689` | Payment status with ownership check              |
| `assertPrizeCreditAllowed` | `payment.use-case.ts:255` | Blocks prize credit before publication           |

#### Repository (packages/db/src/repositories/payment.repository.ts)

- Full CRUD for Wallet, PaymentTransaction, LedgerEntry
- `createWalletDebitPayment` - atomic debit with serializable isolation, idempotent, retry on serialization
- `updateWalletBalanceAtomic` - optimistic concurrency via version field
- `createCompensationLedgerEntry` - compensation with self-relation
- `createCheckoutPayment` - provider checkout with participation linking
- `applyWebhookSettlement` - idempotent webhook settlement with admission
- `ingestProviderWebhook` - durable webhook inbox with duplicate detection

#### RPC (ConnectRPC)

| RPC                 | File                         | Purpose                             |
| ------------------- | ---------------------------- | ----------------------------------- |
| `GetWallet`         | `rpc/payment-service.ts:121` | Wallet + recent ledger entries      |
| `GetPaymentHistory` | `rpc/payment-service.ts:158` | Paginated payment list (basic page) |

#### Prisma Schema (packages/db/prisma/schema.prisma)

- `Wallet` (line 778): id, userId (unique), balance (Decimal), currency, isFrozen, version
- `PaymentTransaction` (line 795): Comprehensive with walletId, userId, amount, type, provider, idempotencyKey (unique), status, wireStatus, etc.
- `LedgerEntry` (line 847): transactionId (unique), walletId, debit/credit (Decimal), balance, reason, direction, ledgerType, idempotencyKey (unique), compensationOfId
- `PartyParticipation` (line 255): paymentState, admissionState, paymentTransactionId

#### Frontend (apps/web)

| Route                           | File                              | Features                                          |
| ------------------------------- | --------------------------------- | ------------------------------------------------- |
| `/me/wallet`                    | `app/(client)/me/wallet/page.tsx` | Balance card, gains section, last movements table |
| `/me/layout.tsx`                | -                                 | RoleGate with PLAYER/ADMIN/SUPER_ADMIN            |
| `/parties/[partyCode]/payment/` | -                                 | Payment flow for party participation              |

#### Payment API Client (apps/web/src/services/payment/payment-api.ts)

- Full REST client for all wallet/payment endpoints
- `getWallet()`, `getLedger()`, `payWithWallet()`, `initiate()`, `getStatus()`
- `mapPaymentStatusLabel()`, `formatXaf()`

#### Tests

- `apps/api/src/use-cases/payment/__tests__/payment.use-case.test.ts` (488 lines)
- `apps/api/src/routes/__tests__/payment.test.ts`
- `apps/api/src/rpc/__tests__/payment-service.test.ts`
- `apps/web/src/__tests__/payment-api.test.ts`
- `apps/web/src/__tests__/payment-checkout.test.ts`
- `packages/db/src/__tests__/payment.repository.test.ts`
- `packages/db/src/__tests__/payment-l3-webhook.integration.test.ts`

### Gaps Identified

1. **Pagination**: `listMyLedger` and `listMyPayments` return ALL records with no pagination support
2. **Transaction detail**: No page for viewing individual transaction details (`/me/wallet/transactions/[id]`)
3. **Export**: No player-facing transaction export feature
4. **TOP_UP flow**: Wallet recharge button is disabled
5. **Stale state**: Player wallet page uses basic loading/error but no stale data indicator
6. **Mismatch metrics**: No balance/ledger reconciliation display for players
7. **Payment history page**: No dedicated `/me/wallet/history` page with paginated payments
8. **Empty/error states**: Gains section is static (always shows 0)
