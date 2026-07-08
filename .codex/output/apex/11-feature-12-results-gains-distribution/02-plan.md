# Step 02: Plan

**Task:** Feature 12 results gains distribution
**Started:** 2026-07-08T10:12:08Z

---

## Planning Progress

_Implementation plan will be written here..._

## Plan

1. Extend Prisma results schema with result/distribution status enums, integer XAF fields, idempotency keys, `CommissionRecord`, and `DisputeWindow`.
2. Add SQL migration and export new enums from `@session-jeu/db`.
3. Implement API result service for XAF/bps formulas, finalization, player/admin result reads, correction request, and prize credit helper.
4. Add BullMQ producer for `credits.distribute`.
5. Add player route `GET /v1/sessions/:id/results`.
6. Add admin routes `POST /v1/admin/sessions/:id/finalize`, `GET /v1/admin/sessions/:id/results`, and `POST /v1/admin/sessions/:id/correction-request`.
7. Add worker processor for idempotent wallet credit distribution and crash recovery.
8. Add unit, route, worker, and DB smoke tests.
9. Run Prisma validation/generation and full monorepo `typecheck`, `lint`, `test`, `build`.
