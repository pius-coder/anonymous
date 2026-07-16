# Step 01: Analyze

**Task:** A-PAYMENT - Paiement, wallet et finance
**Completed:** 2026-07-16

## Context Discovery

### Related files
| File | Contains |
|------|----------|
| `apps/api/src/use-cases/payment/payment.use-case.ts` | Initiate, webhook, wallet pay, finance reconcile |
| `packages/db/src/repositories/payment.repository.ts` | Wallet, transactions, ledger, settle, debit atomic |
| `packages/contracts/proto/payment/v1/payment.proto` | PaymentService frozen |
| `apps/api/src/rpc/routes.ts` | Central router (forbidden to edit) — Payment not mounted |
| `apps/web/src/services/rpcServices.ts` | Forbidden; PaymentService client already present |
| `apps/web/src/components/player/PaymentPanel.tsx` | Was mock timeout UI |
| `apps/web/src/components/finance/*` | Was mock finance-data |

### Patterns
- Identity Connect service uses `ServiceImpl` + `requireRpcUser` / `ConnectError`
- REST payment routes already mounted in `apps/api/src/index.ts`
- Repos public via `paymentRepository` namespace from SEQ-02

### Acceptance criteria (from fiche)
1. Initiate/wallet pay: idempotency key + server amount
2. Duplicate webhook does not double wallet/ledger
3. Finance read-only except audited reconcile
4. UI: pending/success/failed/timeout/retry without inventing status
5. Gains invisible/non-credited before publication
