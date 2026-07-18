# Validate — A-IDENTITY password reset

## AC → tests

| AC | Test |
|---|---|
| Request sans énumération | L1 use-case + L4 Connect known/unknown + L5 UI |
| Token opaque/expire/single-use | L1 use-case + L3 PG hash/consume + L4 invalid token |
| sessionVersion + live revoke | L1 use-case + L3 PG sessions/live + L5 old cookie refused |
| Rate limit + audit sans secret | identity-service rate keys + audit metadata sans token |
| UI états | L5 request success, confirm invalid, full reset flow |

## Commandes

- `pnpm --filter @session-jeu/api test` → 66 passed
- L3 `l3-password-reset.integration.test.ts` → 2 passed (PG local)
- L4 `l4-identity-password-reset.smoke.test.ts` → 2 passed
- L5 `e2e/auth.spec.ts` → 3 passed
- typecheck api/web, lint api, docs:check, build web (route `/auth/reset/confirm`)

## Interdits respectés

- Pas de touche `packages/contracts/**`, `packages/db/prisma/**`, `rpc/routes.ts`, root tooling.
