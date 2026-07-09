# Step 02: Plan

**Task:** create missing administration routes and workflows from project docs
**Started:** 2026-07-09T13:34:49Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan: create missing administration routes and workflows

### Overview

Build the missing Next.js admin web layer on top of the existing Hono admin APIs. Keep the backend and Prisma schema unchanged because the analysis found the API surface already exists.

### File Changes

#### `apps/web/src/app/admin/admin-types.ts` (new)
- Add shared TypeScript shapes for admin sessions, payments, minigames, audit entries, support users, roles, and pagination.
- Match response shapes documented by the API report.

#### `apps/web/src/app/admin/admin-api.ts` (new)
- Add server-only `adminApiGet<T>()` that forwards cookies to `API_URL`, uses `cache: "no-store"`, unwraps the standard `{ success, data }` envelope, and returns `null` on failed fetch.
- Add `getCurrentAdmin()` and `queryString()` helpers.

#### `apps/web/src/app/admin/admin-format.ts` (new)
- Add display helpers for dates, XAF amounts, shortened IDs, and JSON previews.

#### `apps/web/src/components/admin/CreateSessionForm.tsx` (new)
- Add client form for `POST /admin/sessions` via existing `/api/v1` rewrite.
- Include fields supported by `createAdminSessionSchema`: name, code, description, capacity, visibility, XAF amount, bps fields, dates, and reason.
- Redirect to `/admin/sessions/:id` on success.

#### `apps/web/src/components/admin/AdminActionForms.tsx` (new)
- Add client action forms for session lifecycle, live controls, payment reconciliation, wallet adjustment, minigame enable/disable, and support case creation.
- Require a reason where the backend schema requires it.
- Refresh current route after successful mutation.

#### `apps/web/src/app/admin/sessions/page.tsx`
- Replace dashboard placeholder data with `GET /v1/admin/sessions`.
- Render a table with session code, name, status, capacity, price, start date, detail/live links.

#### `apps/web/src/app/admin/sessions/new/page.tsx` (new)
- Render the creation form and fetch active minigames for operator context.

#### `apps/web/src/app/admin/sessions/[id]/page.tsx` (new)
- Fetch `GET /v1/admin/sessions/:id`.
- Render session detail cards, registrations, rounds, and lifecycle actions.

#### `apps/web/src/app/admin/live/page.tsx` (new)
- Fetch ACTIVE, WAITING_START, and LIVE sessions and link to per-session live control.

#### `apps/web/src/app/admin/sessions/[id]/live/page.tsx` (new)
- Fetch session detail and render live state, registrations, and control actions.

#### `apps/web/src/app/admin/payments/page.tsx` (new)
- Fetch `GET /v1/admin/payments`.
- Render transactions with masked provider IDs and reconciliation form.

#### `apps/web/src/app/admin/wallets/page.tsx` (new)
- Fetch dashboard finance wallet summary.
- Render wallet adjustment form.

#### `apps/web/src/app/admin/users/page.tsx` (new)
- Support lookup by `?id=`.
- Fetch `GET /v1/admin/support/users/:id`, render profile, registrations, payments, cases, ledger, support case form, and wallet adjustment form.

#### `apps/web/src/app/admin/minigames/page.tsx` (new)
- Fetch `GET /v1/admin/minigames`.
- Render definitions and enable/disable form.

#### `apps/web/src/app/admin/audit/page.tsx` (new)
- Fetch `GET /v1/admin/audit-logs` with supported filters.
- Render audit table and latest before/after JSON preview.

### Testing Strategy

- Run `pnpm --filter @session-jeu/web typecheck`.
- Run `pnpm --filter @session-jeu/web lint`.
- Run `pnpm --filter @session-jeu/web test`.
- Then run root `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` if targeted checks pass or after fixing targeted failures.

### Acceptance Criteria Mapping

- AC1: New `page.tsx` files for all sidebar routes and `/admin/sessions/new`.
- AC2: `CreateSessionForm.tsx` posts to existing create session API.
- AC3: `admin-api.ts` and pages consume current API response contracts.
- AC4: `AdminActionForms.tsx` includes reason fields for sensitive actions.
- AC5: Dynamic pages use Next 16 Promise params/searchParams and async `cookies()`.
