# Step 01: Analyze

**Task:** P-A-FAPSHI - Collecte Fapshi officielle: remplacer faux adaptateur par integration Fapshi sandbox/live fail-closed et checkout joueur reel
**Started:** 2026-07-17T09:36:50Z
**Worktree:** `/home/afreeserv/worktrees/anonymous/p-a-fapshi` @ `apex/p-a-fapshi` (`61d8622`)

---

## Context Discovery

### Keywords
- Domain: Fapshi, collection, checkout, webhook, reconciliation, externalId, transId
- Technical: initiate-pay, payment-status, x-wh-secret, apiuser/apikey, ProviderWebhookInbox
- Forbidden patterns: Bearer, `/initiate`, checkoutUrl/reference inventés, fapshi-local-*, DB status inject

### Related Files Found

| File | Lines / role | Contains |
|------|--------------|----------|
| `apps/api/src/payments/provider-adapter.ts` | 1–89 | **Faux adaptateur** : Bearer + `/initiate` + `checkoutUrl`/`reference` ; fallback `fapshi-local-*` hors strict |
| `apps/api/src/use-cases/payment/payment.use-case.ts` | 191–325, 476–508 | `initiatePayment`, `handlePaymentWebhook` (settle direct, pas inbox), reconcile admin |
| `apps/api/src/routes/payment.ts` | 57–88 | REST initiate + webhook body inventé (`signature` JSON) |
| `apps/api/src/rpc/payment-service.ts` | 69–95 | Connect `processPayment` → initiatePayment |
| `packages/db/src/repositories/payment.repository.ts` | 64–165, 368–605, 607+ | createCheckoutPayment, ingestProviderWebhook, applyWebhookSettlement, settlePaymentWebhook (deprecated) |
| `packages/db/prisma/schema.prisma` | 14–70, 795–910 | PaymentStatus, FapshiWireStatus, ProviderWebhookInbox, PaymentReconciliation |
| `packages/config/src/contracts.ts` | 78–109 | FAPSHI_BASE_URL / API_USER / API_KEY / WEBHOOK_SECRET / ENV |
| `packages/config/src/guards.ts` | 10–55 | ban `fapshi-local`, placeholders secrets |
| `apps/worker/src/jobs/paymentReconciliation.ts` | 1–89 | expire PENDING par âge 24h — **pas** de query Fapshi |
| `apps/web/src/components/player/PaymentPanel.tsx` | 1–270 | poll status, pas d'ouverture `checkoutUrl` Fapshi |
| `apps/web/src/services/payment/payment-api.ts` | 1–120 | client REST initiate/status |
| `packages/contracts/proto/payment/v1/payment.proto` | enums + ProcessPayment, IngestProviderWebhook | contrats figés (hors ownership mutation) |
| `packages/contracts/fixtures/payment/v1/fapshi-lifecycle.json` | full | wire/internal statuses, constraints no-leak |
| `packages/shared/src/payments/errors.ts` | 1–20 | PAYMENT_ERRORS codes |
| `docs/06-roadmap/apex-tasks/production/wave-a/P-A-FAPSHI-official-collection.md` | full | fiche mission |
| `docs/05-workflows/production-env-contract.md` | ~28–41 | vars Fapshi + ban local fallback |

### Patterns Observed
- **Server amounts**: `server-amount.ts` — ACCESS_FEE from catalog/env, never client trust for fee.
- **Idempotency**: `idempotencyKey` unique on PaymentTransaction; race re-read.
- **Production DB already has**: `providerExternalId`, `providerTransId`, `checkoutUrl`, wire/internal status, inbox, reconciliation tables.
- **Production use-case still uses**: deprecated `settlePaymentWebhook` + fake adapter fields (`reference` as provider ref).
- **Config strict**: FAPSHI_* required in staging/production via `@session-jeu/config`.
- **UI**: polls `/v1/payments/:id/status`; does not redirect to Fapshi `link`.
- **Ownership boundary**: no proto/DB schema edits; no central RPC mount; no payout credentials (P-A-FINANCE).

### Legacy (git `main`, deleted on v0.1 clean)
- `apps/api/src/payments/fapshiClient.ts`: official headers `apiuser`/`apikey`, `POST /initiate-pay`, `GET /payment-status/:transId`, `POST /expire-pay`, responses `link` + `transId`.
- `apps/api/src/payments/fapshi.ts`: durable intent with `providerExternalId` before initiate; webhook event key; amount verification via `hasVerifiedFapshiSuccessAmount`; registration admission on SUCCESSFUL.
- `apps/api/src/routes/payments.ts`: webhook route reads header `x-wh-secret` (not body signature).
- `packages/shared/src/payments/fapshi.ts`: amount equality check for SUCCESSFUL only.

### Official Fapshi API (docs.fapshi.com)
- Base: `https://sandbox.fapshi.com` | `https://live.fapshi.com`
- Auth headers: `apiuser`, `apikey` (not Bearer)
- `POST /initiate-pay` body: `amount` (min 100 XAF), optional email, redirectUrl, userId, externalId, message
- Response 200: `message`, `link`, `transId`, `dateInitiated`
- `GET /payment-status/{transId}`: statuses CREATED|PENDING|SUCCESSFUL|FAILED|EXPIRED; max 6 req/min/transId
- Webhook: POST payload = same as payment-status body; header `x-wh-secret`; **no retries** if receive fails
- Link expiry 24h; expire-pay for initiate-pay only
- IP whitelist for initiate-pay / direct-pay / payout only

### Gaps (what exists vs mission — factual)
1. Adapter uses non-official path `/initiate` + Bearer + `checkoutUrl`/`reference`.
2. Local fake `fapshi-local-*` still returned outside strict env.
3. Webhook body schema invents `signature`/`transactionId`/`providerReference`; no `x-wh-secret` header.
4. Webhook mutates success without `payment-status` re-query.
5. Use-case ignores `ingestProviderWebhook` / `applyWebhookSettlement` / `createCheckoutPayment`.
6. No host allowlist on checkout `link`.
7. No server-built `redirectUrl` enforcement.
8. No UNKNOWN / ambiguous timeout path; initiate timeout not modeled.
9. Worker reconciliation does not call provider status; admin reconcile forces FAILED.
10. PaymentPanel never opens official `link`.
11. No L1 client mapping tests / L4 sandbox contract tests in current tree under `apps/api/src/payments/`.
12. No runbook rotation/incident doc in ownership surface.

### Utilities Available
- `paymentRepository.createCheckoutPayment`, `ingestProviderWebhook`, `applyWebhookSettlement`
- `findTransactionByProviderTransId` / `ByProviderExternalId`
- `createReconciliation` / `updateReconciliation` / `expireDueCheckouts`
- Config contracts + production guards
- Shared `PAYMENT_ERRORS` (extendable without proto)
- Legacy algorithm recoverable from `main` (reference only)

### Test Patterns
- Vitest unit: `apps/api/src/use-cases/payment/__tests__/payment.use-case.test.ts` (mocks db + provider)
- L3 integration: `packages/db/src/__tests__/l3-webhook-idempotency.integration.test.ts`, `payment-l3-webhook.integration.test.ts`
- Config: `packages/config/src/__tests__/validate.test.ts`
- No current `fapshi.test.ts` in payments folder (only server-amount)

### Libraries / HTTP
- Native `fetch` (no Fapshi SDK in package.json)
- Hono routes + ConnectRPC payment service
- Context7: Hono/Connect if needed for headers/timeout patterns; Fapshi not on Context7 (official docs only)

## Inferred Acceptance Criteria

- [ ] AC1: Absent/malformed Fapshi config or response fails closed (no fake success / no fapshi-local)
- [ ] AC2: Official `POST /initiate-pay` with apiuser/apikey; validates `link` host allowlist + `transId`
- [ ] AC3: Durable intent + unique `externalId` before initiate; ambiguous timeout → UNKNOWN + reconcile, no blind retry
- [ ] AC4: Webhook requires `x-wh-secret` (timing-safe), ack fast, durable inbox, process async after payment-status verify
- [ ] AC5: Success only if amount/currency/externalId/transId (+ participation identity when set) match
- [ ] AC6: Duplicate/out-of-order/forged webhooks do not double-settle
- [ ] AC7: UI opens server-returned checkout link and polls status; no secrets client-side
- [ ] AC8: L1 mapping/errors, L3 inbox/idempotence, L4 sandbox contract (controlled), L5 checkout path without DB inject
- [ ] AC9: Kill switch + rotation/incident runbook; no fake fallback

---

## Summary

**Files analyzed:** ~25  
**Patterns identified:** 8  
**Utilities found:** production repo methods ready; API layer still on fake adapter  

**Key findings:**
- Production DB/contracts ready for official collection; API adapter/use-case/webhook are the rewrite surface.
- Official Fapshi fields: `link`/`transId`/`externalId` + headers `apiuser`/`apikey` + webhook `x-wh-secret`.
- Legacy `main` client is a proven reference (not to copy domain models wholesale).

→ Proceeding to planning phase...
