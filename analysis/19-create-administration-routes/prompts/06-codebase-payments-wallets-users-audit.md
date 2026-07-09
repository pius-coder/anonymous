# Agent 06: codebase payments wallets users audit

Role: explore-codebase.

Task: Discover existing admin support surfaces for payments, wallets, users/players, security, operations, notifications, and audit.

Read and reference:
- `apps/api/src/routes/admin/payments.ts`
- `apps/api/src/routes/admin/wallets.ts`
- `apps/api/src/routes/admin/security.ts`
- `apps/api/src/routes/admin/operations.ts`
- `apps/api/src/routes/admin/notifications.ts`
- `apps/api/src/routes/players.ts`
- `apps/api/src/players/playerProfile.ts`
- `apps/api/src/wallet/**`
- `apps/api/src/payments/**`
- related route tests.

Report only facts:
1. Admin support endpoints and response shapes.
2. Existing wallet/payment/user/audit data structures exposed by API.
3. Existing tests and edge cases covered.
4. Missing web pages/routes suggested by API availability and 404 logs.
5. Security/RBAC/audit behavior already present.

Write report target: `analysis/19-create-administration-routes/reports/06-codebase-payments-wallets-users-audit.md`.
