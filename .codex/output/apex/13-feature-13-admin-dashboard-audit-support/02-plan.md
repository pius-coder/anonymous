# Step 02: Plan

**Task:** Feature 13 admin dashboard audit support
**Started:** 2026-07-08T10:54:37Z

---

## Planning Progress

_Implementation plan will be written here..._

## File Plan

### DB

- `packages/db/prisma/schema.prisma`: add `SupportCase`, `IncidentLog`, `AdminActionApproval` and related enums.
- `packages/db/prisma/migrations/20260708110000_feature_13_admin_dashboard_audit_support/migration.sql`: create tables, indexes, and FKs.
- `packages/db/src/__tests__/index.test.ts`: assert new Prisma models are exposed.

### API

- `apps/api/src/admin/operations.ts`: dashboard KPI queries, audit-log filters, support user serializer, incident/action schemas and helpers, role matrix.
- `apps/api/src/routes/admin/operations.ts`: expose `GET /dashboard`, `GET /audit-logs`, `GET /support/users/:id`, `POST /incidents`, `POST /actions`, `POST /actions/:id/approve`.
- `apps/api/src/index.ts`: mount admin operations router under `/v1/admin`.
- `apps/api/src/routes/admin/payments.ts`: require reconciliation reason and write richer audit context.

### Web

- `apps/web/src/app/admin/page.tsx`: server-rendered admin dashboard view consuming `/v1/admin/dashboard`, with sanitized DTOs only.
- `apps/web/src/__tests__/pages.test.ts`: include admin page in export/wording checks.

### Tests

- `apps/api/src/routes/__tests__/admin-operations.test.ts`: RBAC, dashboard role scope, audit search filters, support privacy, incident/action reason requirements and approvals.
- Update `apps/api/src/routes/__tests__/admin-payments.test.ts`: reason required and richer audit.

### Role Matrix

- `SUPER_ADMIN`: all Feature 13 operations.
- `ADMIN`: dashboard, audit logs, support view, incidents, action request; cannot approve own critical action.
- `SUPPORT`: support-scoped dashboard, audit read, support user view, incident creation; no finance ledger detail or gameplay controls.
- `FINANCE`: finance dashboard, support user finance fields including ledger summary, audit read for finance/payment/wallet, payment reconciliation; no gameplay controls or incident creation.
- `PLAYER`: denied by default for all admin operations.
