# Step 07: Tests

**Task:** P-A-SCORING - Preuves, publication et gains atomiques
**Started:** 2026-07-18T01:23:48Z

---

## Test Analysis and Creation

- Extended unit coverage for scoring use-cases with admin dossier generation, publication block on invalid evidence and atomic publish/gains assertions.
- Added `apps/api/src/routes/__tests__/admin-scoring-rbac.l4.test.ts` to cover RBAC and blocked publish mapping on the new admin routes.
- Updated `packages/db/src/__tests__/l3-score-publish-atomic.integration.test.ts` to assert `evidenceHash` durability through atomic publication.
- Reworked `apps/api/src/use-cases/scoring/__tests__/scoring.l5-flow.test.ts` to validate admin correction -> publish -> player published results flow on the new atomic path.
