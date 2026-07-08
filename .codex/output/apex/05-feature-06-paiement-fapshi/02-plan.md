# Step 02: Plan

**Task:** continue sequential implementation with Feature 06 Fapshi payments
**Started:** 2026-07-08T04:38:25Z

---

## Planning Progress

1. Extend Prisma schema for Fapshi payment lifecycle.
2. Add migration from old `PaymentStatus.COMPLETED` to `SUCCESSFUL`.
3. Add API Fapshi client with env-driven sandbox/live base URL and required headers.
4. Add payment business logic for initiation, webhook application, and serialization.
5. Add public webhook route, authenticated player initiation/status routes, and finance-only manual reconciliation route.
6. Add BullMQ reconciliation job producer and worker processor.
7. Cover webhook idempotency, status transitions, route authorization, manual reconciliation, and worker reconciliation with tests.
8. Run Prisma validation/generation and full repo validation gates.
