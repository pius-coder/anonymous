# Agent 10: docs Hono Prisma admin contracts

Role: explore-docs.

Task: Fetch current docs for Hono and Prisma that are relevant to admin API contracts, JSON responses, route testing, Prisma filtering/pagination/includes, transactions, and role-protected endpoints.

Use Context7. Do not run more than three commands total:
1. `npx ctx7@latest library Hono "Hono route handlers JSON responses middleware route testing TypeScript"`
2. `npx ctx7@latest docs <bestHonoLibraryId> "Hono route handlers JSON responses middleware route testing TypeScript"`
3. If Hono results are insufficient for Prisma needs, use the remaining command for `npx ctx7@latest library Prisma "Prisma Client filtering pagination include transactions TypeScript"` and report that Prisma docs need a follow-up fetch.

Report only documented facts:
1. Library IDs used.
2. Current Hono route/middleware/testing APIs found.
3. Prisma docs status and any fetched Prisma facts.
4. Version-specific gotchas relevant to the repo.

Write report target: `analysis/19-create-administration-routes/reports/10-docs-hono-prisma-auth.md`.
