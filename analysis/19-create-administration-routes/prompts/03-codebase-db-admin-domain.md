# Agent 03: codebase database admin domain

Role: explore-codebase.

Task: Discover the Prisma/database models, enums, seeds, migrations, and query patterns relevant to administration.

Read and reference:
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**/migration.sql`
- `packages/db/prisma/seed.ts`
- `packages/db/src/**`
- API files that query `gameSession`, `sessionRegistration`, `paymentTransaction`, `wallet`, `auditLog`, `user`, `miniGame`, or live/round models.

Report only facts:
1. Relevant models/enums with line numbers.
2. Existing seed admin/local data.
3. Migration state related to admin-visible data.
4. Query include/select patterns used by existing routes.
5. Existing DB tests relevant to admin workflows.

Write report target: `analysis/19-create-administration-routes/reports/03-codebase-db-admin-domain.md`.
