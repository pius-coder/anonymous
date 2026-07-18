# Step 04: Validate

## Gates

| Gate | Result |
|------|--------|
| shared tests | pass (13) |
| api payment unit/L1 | pass (23 + 2 skipped sandbox) |
| payment routes | pass (10) |
| worker payment recon | pass (3) |
| web payment tests | pass (6) |
| typecheck api/worker/db/shared/web | pass |
| L4 sandbox live | skipped (no FAPSHI_RUN_SANDBOX) |
| Commit | `ce0defc` on `apex/p-a-fapshi` |

## AC checklist

- [x] AC1 fail-closed config/malformed response
- [x] AC2 official initiate + link allowlist
- [x] AC3 durable externalId + UNKNOWN/timeout path
- [x] AC4 webhook secret + inbox + status verify
- [x] AC5 amount/externalId match before SUCCESS
- [x] AC6 duplicate inbox
- [x] AC7 UI checkout + poll/return
- [x] AC8 L1/L3 unit/L5; L4 opt-in
- [x] AC9 kill switch + runbook

## Remaining risks

- Real sandbox proof needs credentials + `FAPSHI_RUN_SANDBOX=1`
- IP whitelist on Fapshi dashboard for live initiate-pay

## Follow-up (-E full review)

- Found gap: runner called reconcile without provider client → only age expiry.
- Fixed in `6172f57`: `tryCreateFapshiStatusClient()` wired in worker runner.
- Worker tests: payment recon + fapshi-status pass; typecheck pass.

## Status

✓ Complete (post -E hardening pushed to PR #38)
