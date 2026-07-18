# Step 03: Execute

**Status:** complete  
**Worktree:** `/home/afreeserv/worktrees/anonymous/p-a-fapshi`  
**Branch:** `apex/p-a-fapshi`

## Implemented

### Shared
- `packages/shared/src/payments/fapshi.ts` — pure validators, allowlist, amount match, redaction
- Error codes: PROVIDER_NOT_CONFIGURED, TIMEOUT_AMBIGUOUS, CHECKOUT_LINK_REJECTED, WEBHOOK_SECRET_REQUIRED, COLLECTION_DISABLED

### API
- `fapshi-client.ts` — official HTTP client
- `fapshi-collection.ts` — secret verify, redirectUrl server-built, settlement match
- `provider-adapter.ts` — rewrites fake Bearer/local path away
- `payment.use-case.ts` — durable externalId, inbox webhook, verifyAndSettle, reconcile from provider
- `routes/payment.ts` — x-wh-secret + official body

### Worker / UI / Docs
- payment reconciliation provider status path
- PaymentPanel opens Fapshi link; return page `/payments/return`
- `docs/05-workflows/fapshi-collection-runbook.md`

## Tests
- L1 shared + fapshi-client + use-case
- L3 inbox unit via mocks + existing db L3 (unchanged)
- L4 sandbox skipUnless FAPSHI_RUN_SANDBOX=1
- L5 checkout URL policy

## Notes
- No proto/DB schema changes
- Sandbox live L4 not run (no credentials in env)
