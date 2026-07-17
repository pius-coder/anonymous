# Step 02: Plan

**Task:** P-A-FAPSHI — Collecte Fapshi officielle  
**Worktree:** `/home/afreeserv/worktrees/anonymous/p-a-fapshi`  
**Branch:** `apex/p-a-fapshi`

---

## Implementation Plan: Collecte Fapshi officielle

### Overview

Remplacer le faux `provider-adapter` par un client HTTP Fapshi officiel fail-closed (`apiuser`/`apikey`, `/initiate-pay`, `/payment-status`, allowlist hosts), rebrancher le use-case de collecte sur intent durable + inbox webhook + vérification status avant mutation, ouvrir le checkout joueur côté UI, et couvrir L1/L3/L4(+L5 mock) sans toucher proto/DB/montage central/payout.

### Prerequisites
- [x] Worktree `p-a-fapshi` sur base `61d8622` (P-SEQ-03 merged)
- [x] Schéma production + `ingestProviderWebhook` / `applyWebhookSettlement` / `createCheckoutPayment` déjà présents
- [x] Docs Fapshi officielles lues (initiate-pay, payment-status, webhook, environment)
- [ ] Sandbox credentials optionnels pour L4 (si absents: tests contract mockés + skip gate documenté)
- [ ] Context7 pour Hono header reading / timing-safe compare patterns si besoin (max 3)

### Decisions (auto_mode recommended)
1. **Client location:** `apps/api/src/payments/fapshi-client.ts` (HTTP pur) + mapper dans `fapshi-collection.ts` (validation/allowlist/redaction). Supprimer le comportement fake de `provider-adapter.ts` (réécrire en re-export ou delete + update imports).
2. **Fail-closed partout:** pas de `fapshi-local-*` même en development si `FAPSHI_*` manquant → erreur `PROVIDER_NOT_CONFIGURED` / 502; tests unitaires mockent le client.
3. **Webhook flow:** REST ACK rapide → `ingestProviderWebhook` → process async in-process (queue setImmediate / void promise) qui appelle `getPaymentStatus` puis `applyWebhookSettlement`. Pas de succes du seul body webhook.
4. **externalId:** généré serveur (`pay_<uuid sans tirets>` ou hex) stocké `providerExternalId` **avant** initiate; idempotencyKey client reste la clé d'intent applicative.
5. **redirectUrl:** construit serveur depuis `APP_PUBLIC_URL` / `WEB_ORIGIN` + path return paiement (jamais body client arbitraire).
6. **Checkout host allowlist:** parse `link` URL; hostname doit matcher `sandbox.fapshi.com`, `live.fapshi.com`, ou suffixe documenté Fapshi checkout si présent dans réponses (fallback: same-origin allowlist config `FAPSHI_CHECKOUT_HOSTS` + defaults).
7. **UNKNOWN:** sur timeout/abort après envoi initiate sans body, marquer `internalStatus=RECONCILING` / wire non terminal, planifier reconcile status; ne pas re-POST initiate.
8. **Kill switch:** `FAPSHI_COLLECTION_ENABLED=0|false` refuse initiate avec erreur claire.
9. **Out of scope:** proto, migrations, payout, admission scheduler, montage RPC central, refund métier.

---

### File Changes

#### `apps/api/src/payments/fapshi-client.ts` (NEW)
- Client HTTP minimal:
  - `resolveFapshiBaseUrl()` allowlist `https://sandbox.fapshi.com` | `https://live.fapshi.com` only
  - `getCollectionCredentials()` → apiuser/apikey from env; throw if missing
  - `initiatePay(body)` → `POST /initiate-pay` headers apiuser/apikey, JSON, timeout+AbortController
  - `getPaymentStatus(transId)` → `GET /payment-status/{transId}` (safe retry: 1× on network reset only if no partial)
  - `expirePay(transId)` → `POST /expire-pay` (optional helper for runbook/tests)
- Types: `FapshiWireStatus`, `InitiatePayRequest`, `InitiatePayResponse` (`link`, `transId`), `PaymentStatusResponse`
- Errors: `FapshiHttpError` with status, redacted message (never log apikey/apiuser)
- Redaction helper for logs: strip secrets from headers/body

#### `apps/api/src/payments/fapshi-collection.ts` (NEW)
- Mapping L1: wire status → internal; validation:
  - `assertCheckoutLinkAllowed(link)`
  - `assertTransId(transId)`
  - `buildServerRedirectUrl(paymentId)`
  - `verifyWebhookSecret(header, secret)` timing-safe (`crypto.timingSafeEqual` after length check)
  - `mapWireToPaymentStatus`
  - `assertSettlementMatch({ expected amount/currency/externalId/transId/userId })`
- `initiateCollectionCheckout(input)`:
  1. kill switch
  2. ensure durable payment row with unique `providerExternalId` (via repo)
  3. call initiatePay
  4. validate link/transId
  5. update row with checkoutUrl, providerTransId, wire CREATED/PENDING
  6. on ambiguous timeout: set RECONCILING/UNKNOWN path, do not re-initiate
- `processCollectionWebhook(raw, headerSecret)`:
  1. verify secret (fail closed if secret unset in any env for collection webhook route)
  2. parse official payload (transId, status, amount, externalId, userId…)
  3. ingest inbox (externalEventId = `fapshi:{transId}:{status}` or hash)
  4. schedule async verification
- `verifyAndSettleFromProvider(transId | paymentId)`:
  1. GET payment-status
  2. match amount/currency/externalId
  3. applyWebhookSettlement

#### `apps/api/src/payments/provider-adapter.ts` (REWRITE)
- Remove Bearer, `/initiate`, local fake entirely
- Either thin re-export of `initiateCollectionCheckout` for backward imports, or delete and fix imports
- `verifyWebhookSignature` → replace with timing-safe x-wh-secret helper from fapshi-collection

#### `apps/api/src/use-cases/payment/payment.use-case.ts`
- `initiatePayment`:
  - Keep server amount + idempotency
  - Create intent with `providerExternalId` unique **before** provider call (use `createPaymentTransaction` with fields or `createCheckoutPayment` when party/participation available; else collection without participation)
  - Call new collection initiator; store `checkoutUrl` official + `providerTransId`
  - On PROVIDER_NOT_CONFIGURED / kill switch / invalid response → fail closed, mark FAILED or leave PENDING+RECONCILING appropriately
  - Never invent local checkout path
- `handlePaymentWebhook` → rewrite to:
  - accept official payload + header secret
  - inbox only + enqueue verify (return 200 quickly with `{ received: true, inboxId }`)
  - **do not** call settlePaymentWebhook on raw payload alone
- Add `processWebhookInboxItem` / `reconcileCollectionPayment` that queries payment-status then applyWebhookSettlement
- Keep wallet pay / prize block / admin list intact
- Narrow admin `reconcilePayment`: prefer provider status fetch when credentials present; fail closed if kill switch; never invent SUCCESS without provider

#### `apps/api/src/routes/payment.ts`
- Keep `POST /payments/initiate` schema (no client redirectUrl)
- Replace webhook route:
  - Path stay `/payments/webhook/fapshi` (or alias `/webhooks/fapshi` if needed for dashboards — prefer keep existing path to avoid mount changes)
  - Read `x-wh-secret` header
  - Body: passthrough zod on official fields (`transId`, `status`, `amount` optional, `externalId` optional…)
  - Remove invented `signature` body field
  - Return 200 fast on accept; 401 on bad secret
- Status GET unchanged

#### `apps/api/src/rpc/payment-service.ts`
- Ensure processPayment returns official `checkoutUrl` from use-case (no change to central router)
- Map provider fields from `providerTransId`/`providerExternalId` when available instead of `reference` only

#### `apps/web/src/components/player/PaymentPanel.tsx`
- On initiate success: if `checkoutUrl` is absolute https allowlisted host, `window.location.assign` or open in same tab with clear CTA "Continuer le paiement"
- Keep polling after return
- Never send secrets
- Handle return phase from query `?paymentId=` if present

#### `apps/web/src/app/(client)/parties/[partyCode]/payment/page.tsx` (if needed)
- Pass return context; read paymentId query for resume poll

#### `apps/web/src/services/payment/payment-api.ts`
- Types: allow CREATED if surfaced; keep SUCCESSFUL naming
- No secret fields

#### `packages/shared/src/payments/fapshi.ts` (NEW, small pure helpers)
- Restore `hasVerifiedFapshiSuccessAmount` from legacy shared
- Wire status constants / min amount 100 XAF
- Export pure validators usable by L1 tests without pulling API

#### `packages/shared/src/payments/errors.ts`
- Add codes if missing: `PROVIDER_NOT_CONFIGURED`, `PROVIDER_TIMEOUT_AMBIGUOUS`, `CHECKOUT_LINK_REJECTED`, `WEBHOOK_SECRET_REQUIRED`, `COLLECTION_DISABLED`

#### `packages/config` (minimal, only if needed without schema change)
- Document `FAPSHI_COLLECTION_ENABLED` optional in contracts if pattern allows optional vars
- Ensure `FAPSHI_BASE_URL` allowlist validation already present or add guard check for non-allowlisted base URL in validate path (config ownership edge — only if existing validate already extends easily; else validate in client only)

#### `apps/worker/src/jobs/paymentReconciliation.ts` (collection-safe extension)
- For PENDING/RECONCILING collection payments with `providerTransId`, call payment-status (injectable client) then settle; keep age-based EXPIRED only after provider confirms EXPIRED or link age rules
- Do **not** invent SUCCESS
- Ownership note: worker job already exists; only collection status query, not payout

#### `docs/05-workflows/fapshi-collection-runbook.md` (NEW)
- Rotation apiuser/apikey/webhook secret
- Kill switch
- Incident: lost webhook → reconcile job
- Live cutover procedure
- No secrets in doc

#### `.env.example`
- Align names already present; add `FAPSHI_COLLECTION_ENABLED=1`, document no fake fallback

#### Tests (NEW/UPDATE)

| File | Level | Content |
|------|-------|---------|
| `packages/shared/src/__tests__/fapshi-mapping.test.ts` | L1 | status map, amount match, link host reject |
| `apps/api/src/payments/__tests__/fapshi-client.test.ts` | L1 | headers, paths, fail closed, redaction, no Bearer |
| `apps/api/src/payments/__tests__/fapshi-collection.test.ts` | L1 | allowlist, timeout UNKNOWN, kill switch |
| `apps/api/src/use-cases/payment/__tests__/payment.use-case.test.ts` | L1/L3 unit | webhook inbox path, no settle without verify |
| `packages/db/src/__tests__/l3-webhook-idempotency.integration.test.ts` | L3 | keep + ensure still green |
| `apps/api/src/payments/__tests__/fapshi-sandbox.contract.test.ts` | L4 | skipIf no sandbox env; real initiate+status if `FAPSHI_RUN_SANDBOX=1` |
| `apps/web/src/__tests__/payment-checkout.test.ts` | L5 | checkout open behavior without DB inject |

---

### Implementation Order
1. Shared pure validators + error codes  
2. fapshi-client + collection helpers + tests L1  
3. use-case initiate + webhook rewrite  
4. routes webhook header  
5. worker reconcile status query  
6. UI checkout open + return  
7. runbook + env example  
8. L3/L4 tests + gates typecheck/lint/test  

### Acceptance Criteria Mapping
- [ ] AC1 fail-closed config → client + use-case  
- [ ] AC2 official initiate + link allowlist → client + collection  
- [ ] AC3 durable externalId + UNKNOWN timeout → use-case + client  
- [ ] AC4 webhook secret + inbox + status verify → routes + use-case + repo  
- [ ] AC5 amount/currency/ids match → shared + apply path  
- [ ] AC6 idempotent inbox → ingestProviderWebhook + tests  
- [ ] AC7 UI checkout + poll → PaymentPanel  
- [ ] AC8 L1/L3/L4/L5 tests  
- [ ] AC9 kill switch + runbook  

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Sandbox credentials absents | L4 skipIf + document; L1/L3 still gate |
| Re-initiate after timeout creates double Fapshi charge | Never retry initiate; only payment-status/search |
| Host of `link` not sandbox.fapshi.com | Allowlist configurable; reject otherwise |
| Webhook processing blocks HTTP | ACK after inbox write; async process |
| Worker without credentials | Skip provider query, log redacted, no fake settle |
| Breaking existing unit tests | Update mocks to new functions |

### Explicit Non-Goals
- Proto regeneration, Prisma migrations, central RPC router, payout credentials, refund métier, admission auto, scheduler redesign

---

## Step Complete
**Status:** ✓ Complete  
**Files planned:** ~15 modified/new  
**Tests planned:** ~7  
**Next:** step-03-execute.md  
**Timestamp:** 2026-07-17T09:45:00Z
