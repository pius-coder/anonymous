# Step 02: Plan

**Task:** Corriger le dashboard admin qui affiche des metriques fictives ou a zero malgre des utilisateurs inscrits
**Started:** 2026-07-09T14:09:37Z

---

## Planning Progress

## Implementation Plan

### Overview
Expose real registered-user visibility in the admin API/UI so the dashboard no longer appears empty when only accounts exist. Keep zero values for sessions/payments/registrations when those tables are actually empty.

### File Changes

#### `apps/api/src/admin/operations.ts`
- Add an `adminUsersQuerySchema` for `q`, `role`, `page`, `limit`.
- Extend `getAdminDashboard()` with real `users` KPIs: total users, active users, players, admin/support/finance users.
- Add `listSupportUsers()` that returns paginated users with safe summary fields, registration/payment/support counts, wallet balance, and profile username.
- Use Prisma `count`, `findMany`, and relation `_count` patterns already used in this service.

#### `apps/api/src/routes/admin/operations.ts`
- Import `adminUsersQuerySchema` and `listSupportUsers`.
- Add `GET /v1/admin/support/users` before `GET /v1/admin/support/users/:id` to avoid route ambiguity.
- Protect it with `requireAuth` + `requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE")`.

#### `apps/api/src/routes/__tests__/admin-operations.test.ts`
- Add Prisma mocks for `user.count` and `user.findMany`.
- Assert dashboard includes user KPIs.
- Add a test for list/search users returning safe account summaries.

#### `apps/web/src/app/admin/admin-types.ts`
- Add `AdminDashboard` and `SupportUserSummary` types.

#### `apps/web/src/app/admin/page.tsx`
- Replace local dashboard response type and fetch helper with shared `adminApiGet`.
- Render a new "Utilisateurs" KPI section with total, players, active, admin/support/finance accounts.

#### `apps/web/src/app/admin/users/page.tsx`
- Fetch `GET /v1/admin/support/users` by default with optional `q` and `role`.
- Render a real users table with user ID, email/name, username, role, status, registrations, payments, wallet.
- Keep the existing exact-ID detail view when `id` is provided.

### Tests
- Run targeted API test: `pnpm --filter @session-jeu/api test -- src/routes/__tests__/admin-operations.test.ts`.
- Then run required repo validations as far as feasible: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

### Acceptance Criteria
- Admin dashboard shows registered account counts from DB.
- Users page shows registered users without requiring an exact ID.
- Existing session/payment KPIs remain real DB zeros when those rows do not exist.
- Player role remains forbidden from admin dashboard.
