# Step 04: Validate

## Results
| Gate | Result |
|------|--------|
| `@session-jeu/db` test (incl. L3 PG) | 38/38 pass |
| `@session-jeu/api` test | 72/72 pass |
| `@session-jeu/web` test | 19/19 pass |
| typecheck api+web | pass |
| lint api+web | pass |
| build api | pass |
| git diff --check | clean |

## Context7 IDs
- `/connectrpc/connect-es` (ConnectRPC TypeScript ServiceImpl)
- TanStack Query present in app (`@tanstack/react-query` 5.90.3) — used via existing Providers
- Prisma transactions: existing repo Serializable isolation consumed

## Risks remaining
- PaymentService not mounted in central `rpc/routes.ts` (SEQ-03)
- Real Fapshi only when `FAPSHI_API_URL` + `FAPSHI_API_KEY` set
- No Playwright multi-service E2E payment path in this lot
- Party entry fee not in schema; server catalog env/productCode used instead
