# Step 01: Analyze

**Task:** Corriger le dashboard admin qui affiche des metriques fictives ou a zero malgre des utilisateurs inscrits
**Started:** 2026-07-09T14:09:37Z

---

## Context Discovery

## Local Docs Read
- `docs/plan/13-dashboard-admin-audit-support.md`: requires `GET /v1/admin/dashboard`, real KPIs, RBAC, audit/support views.
- `docs/prd/features/13-dashboard-admin-audit-support.md`: admin/support/finance must monitor sessions, registrations, payments, wallet, users/support without provider secrets.
- `docs/plan/19-phase3-operateur-lancement.md`: admin dashboard must use real existing admin routes and show operational KPIs.
- `docs/BRAINSTORMING.md`, `docs/PRD_PHASE_1.md`, `docs/PRD_PHASE_2.md`, `docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`, `docs/deep-research-report.md`, `docs/plan/README.md`: server/DB is source of truth; admin actions and support views must be auditable and least-privilege.

## Context7 Docs
- Next.js: `/vercel/next.js`; Server Components can fetch API data with cookies and `cache: "no-store"`.
- Hono: `/websites/hono_dev`; route-level middleware and JSON responses match existing route style.
- Prisma: `/prisma/web`; `count`, filtered `count`, and `groupBy` are appropriate for dashboard/list metrics.

## Code Findings
- `apps/api/src/admin/operations.ts` has `getAdminDashboard()` counting sessions, registrations, incidents, support, payments, wallets, and prize ledger, but no user/account counts.
- `apps/api/src/routes/admin/operations.ts` exposes `GET /v1/admin/dashboard`, `GET /v1/admin/audit-logs`, and `GET /v1/admin/support/users/:id`, but no list/search endpoint for users.
- `apps/web/src/app/admin/page.tsx` renders only session/registration/finance KPIs, so a DB with users but no sessions appears empty.
- `apps/web/src/app/admin/users/page.tsx` only supports lookup by exact user ID. It is not a usable admin list of registered accounts.
- Local DB counts with `.env` loaded: `{ users: 3, players: 2, admins: 1, sessions: 0, regs: 0, paidRegs: 0, payments: 0 }`. This matches the user symptom: created accounts exist, but current dashboard KPIs legitimately stay at zero because they do not include user metrics.

## Existing Patterns
- Admin route tests are in `apps/api/src/routes/__tests__/admin-operations.test.ts` with mocked Prisma and cookie auth.
- Admin UI server data uses `adminApiGet()` in `apps/web/src/app/admin/admin-api.ts` with forwarded cookies and `cache: "no-store"`.
