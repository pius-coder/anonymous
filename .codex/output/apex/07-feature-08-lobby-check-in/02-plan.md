# Step 02: Plan

**Task:** Feature 08 lobby check-in preparation
**Started:** 2026-07-08T05:35:40Z

---

## Planning Progress

1. Extend Prisma schema and migration for lobby lifecycle statuses, check-in timestamps, no-show timestamps, and join tokens.
2. Add API lobby service for lobby read, Redis presence, check-in, admin start authorization, join token issue, and join token consumption.
3. Add Hono routes under `/v1/sessions/:id/*` and `/v1/admin/sessions/:id/start`.
4. Schedule a BullMQ check-in deadline job when registration opens.
5. Add worker processing to mark missed check-ins as `NO_SHOW`.
6. Add focused unit, route, worker, and DB export tests; then run full repo validation.
