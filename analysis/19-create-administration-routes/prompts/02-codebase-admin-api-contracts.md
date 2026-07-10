# Agent 02: codebase admin API contracts

Role: explore-codebase.

Task: Discover all existing admin API routes, response shapes, auth/RBAC behavior, audit behavior, and tests.

Read and reference:
- `apps/api/src/routes/admin/**`
- `apps/api/src/admin/**`
- `apps/api/src/routes/__tests__/admin-*.test.ts`
- `apps/api/src/index.ts`
- `apps/api/src/auth/**`
- `apps/api/src/lib/responses.ts`

Report only facts:
1. Route files, route paths, methods, and line numbers.
2. Response JSON shapes used by admin endpoints.
3. Auth and role checks used by admin endpoints.
4. Existing admin tests and what they cover.
5. API contracts that could be consumed by missing web admin pages.

Write report target: `analysis/19-create-administration-routes/reports/02-codebase-admin-api-contracts.md`.
