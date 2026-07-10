# Agent 01 Report - Codebase admin web routes

## Scope

Prompt read: `analysis/19-create-administration-routes/prompts/01-codebase-admin-web-routes.md`.

Analyzed paths:
- `apps/web/src/app/admin/**`
- `apps/web/src/components/admin/**`
- `apps/web/src/lib/**`
- relevant tests under `apps/web/src/__tests__` and `apps/web/e2e`
- local admin-related docs under `docs/plan/` and `docs/prd/features/`

No source code was modified.

## 1. Existing admin web files

| Path | Lines | Facts |
|---|---:|---|
| `apps/web/src/app/admin/layout.tsx` | 1-3 | Imports `cookies`, `notFound`, and `AdminShell`. |
| `apps/web/src/app/admin/layout.tsx` | 7-16 | Defines sidebar entries for `/admin`, `/admin/sessions`, `/admin/live`, `/admin/payments`, `/admin/wallets`, `/admin/users`, `/admin/minigames`, and `/admin/audit`. |
| `apps/web/src/app/admin/layout.tsx` | 18-24 | `filterSidebarItems()` includes an item when the user role is in `roles` or `viewRoles`. |
| `apps/web/src/app/admin/layout.tsx` | 26-40 | `getSession()` fetches `${API_URL || "http://localhost:3001"}/v1/me` with forwarded cookies and `cache: "no-store"`. |
| `apps/web/src/app/admin/layout.tsx` | 42-46 | `AdminLayout` calls `notFound()` when no user exists or role is not `ADMIN`, `SUPER_ADMIN`, `FINANCE`, or `SUPPORT`. |
| `apps/web/src/app/admin/layout.tsx` | 48-53 | The layout renders `AdminShell` with filtered sidebar items and the authenticated admin user. |
| `apps/web/src/app/admin/admin-shell.tsx` | 1 | Client component. |
| `apps/web/src/app/admin/admin-shell.tsx` | 3-16 | Uses Next `Link`, `usePathname`, `useRouter`, and lucide icons for sidebar navigation and logout. |
| `apps/web/src/app/admin/admin-shell.tsx` | 38-44 | Exports `SidebarItem` with `label`, `href`, `icon`, `roles`, and optional `viewRoles`. |
| `apps/web/src/app/admin/admin-shell.tsx` | 46-55 | Maps string icon names to lucide components. |
| `apps/web/src/app/admin/admin-shell.tsx` | 63-137 | Renders the admin sidebar, user footer, and logout form. |
| `apps/web/src/app/admin/admin-shell.tsx` | 87-102 | Renders each sidebar item as a `SidebarMenuButton` wrapping a `Link`. |
| `apps/web/src/app/admin/admin-shell.tsx` | 89 | Marks an item active when `pathname === item.href` or starts with that href for non-dashboard items. |
| `apps/web/src/app/admin/admin-shell.tsx` | 122-126 | Logout posts `apiPost("/auth/logout")` and routes to `/`. |
| `apps/web/src/app/admin/admin-shell.tsx` | 139-158 | `AdminShell` wraps children in `SidebarProvider`, `Sidebar`, `SidebarInset`, a top header, and `<main className="flex-1 p-6">`. |
| `apps/web/src/app/admin/page.tsx` | 6-9 | Defines metadata for "Admin Operations \| Session Jeu". |
| `apps/web/src/app/admin/page.tsx` | 11-27 | Defines the dashboard response shape: role, sessions, registrations, incidents, support, and optional finance. |
| `apps/web/src/app/admin/page.tsx` | 29-43 | `getDashboard()` fetches `${API_URL || "http://localhost:3001"}/v1/admin/dashboard` with forwarded cookies and `cache: "no-store"`. |
| `apps/web/src/app/admin/page.tsx` | 45-55 | Local `KpiCard` renders `Card`, `CardHeader`, `CardTitle`, and `CardContent`. |
| `apps/web/src/app/admin/page.tsx` | 58-122 | `/admin` page renders an operations dashboard or an "Acces admin requis" card when dashboard data is unavailable. |
| `apps/web/src/app/admin/page.tsx` | 82-117 | Dashboard sections cover sessions/support, registrations, and finance when `dashboard.finance` exists. |
| `apps/web/src/app/admin/sessions/page.tsx` | 8-10 | Defines metadata title "Sessions \| Admin". |
| `apps/web/src/app/admin/sessions/page.tsx` | 12-19 | Defines dashboard response shape for session counts. |
| `apps/web/src/app/admin/sessions/page.tsx` | 21-34 | Fetches `/v1/admin/dashboard` directly from the upstream API with forwarded cookies and `cache: "no-store"`. |
| `apps/web/src/app/admin/sessions/page.tsx` | 36-69 | `/admin/sessions` renders session count text, a CTA to `/admin/sessions/new`, and an empty list card. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 1 | Client component. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 3-10 | Uses React `useMemo`, `@dnd-kit/*`, `simulateProgram` from `@session-jeu/game-engine`, and RetroUI `Button`/`Badge`. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 11-25 | Exports `RoundDraft` with `miniGame`, `configJson`, `durationMs`, and `policy`. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 27-49 | Defines labels for elimination policies. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 51-89 | `SortableRoundCard` renders a draggable round row with badges and Config/remove buttons. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 91-187 | `ProgramBuilder` renders draggable rounds plus a sticky "Funnel d'effectifs" simulation panel. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 108-114 | Computes `funnelMax`, `funnelMin`, and `coherent` from `simulateProgram`. |
| `apps/web/src/components/admin/ProgramBuilder.tsx` | 115-120 | Reorders rounds with `arrayMove` on drag end. |

Current admin app route directories found by filesystem inspection:
- `apps/web/src/app/admin`
- `apps/web/src/app/admin/sessions`

Current admin app route files found:
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/admin-shell.tsx`
- `apps/web/src/app/admin/sessions/page.tsx`

## 2. Existing admin route structure and layout conventions

Existing route structure:
- `/admin` is implemented by `apps/web/src/app/admin/page.tsx`.
- `/admin/sessions` is implemented by `apps/web/src/app/admin/sessions/page.tsx`.
- All `/admin/*` children use `apps/web/src/app/admin/layout.tsx`.
- `apps/web/src/app/admin/layout.tsx:42-46` returns `notFound()` for unauthenticated users and non-admin roles, so unauthorized access to any admin route is intentionally a 404.

Sidebar/navigation facts:
- `apps/web/src/app/admin/layout.tsx:7-16` exposes sidebar links for eight admin destinations.
- `apps/web/src/app/admin/layout.tsx:8` exposes `/admin` to `ADMIN`, `SUPER_ADMIN`, `FINANCE`, and `SUPPORT`.
- `apps/web/src/app/admin/layout.tsx:9` exposes `/admin/sessions` to `ADMIN` and `SUPER_ADMIN`, with view access for `FINANCE` and `SUPPORT`.
- `apps/web/src/app/admin/layout.tsx:10` exposes `/admin/live` to `ADMIN` and `SUPER_ADMIN`, with view access for `SUPPORT`.
- `apps/web/src/app/admin/layout.tsx:11` exposes `/admin/payments` to `ADMIN`, `SUPER_ADMIN`, and `FINANCE`, with view access for `SUPPORT`.
- `apps/web/src/app/admin/layout.tsx:12` exposes `/admin/wallets` to `SUPER_ADMIN` and `FINANCE`, with view access for `SUPPORT`.
- `apps/web/src/app/admin/layout.tsx:13` exposes `/admin/users` to `ADMIN`, `SUPER_ADMIN`, and `SUPPORT`, with view access for `FINANCE`.
- `apps/web/src/app/admin/layout.tsx:14` exposes `/admin/minigames` to `ADMIN` and `SUPER_ADMIN`.
- `apps/web/src/app/admin/layout.tsx:15` exposes `/admin/audit` to `ADMIN`, `SUPER_ADMIN`, `FINANCE`, and `SUPPORT`.
- `apps/web/src/app/admin/admin-shell.tsx:89` treats nested paths as active for non-dashboard sidebar items.
- `apps/web/src/app/admin/sessions/page.tsx:52-54` exposes `/admin/sessions/new` through the "Nouvelle session" CTA.

Layout conventions:
- Admin shell is a client component (`apps/web/src/app/admin/admin-shell.tsx:1`).
- Admin content is wrapped in `SidebarProvider defaultOpen={true}` (`apps/web/src/app/admin/admin-shell.tsx:141`).
- The shell uses `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarHeader`, `SidebarTrigger`, `SidebarInset`, and `useSidebar` from `@/components/retroui/sidebar` (`apps/web/src/app/admin/admin-shell.tsx:17-32`).
- Sidebar is configured as `collapsible="icon"` and styled with `border-r-4 border-border bg-card` (`apps/web/src/app/admin/admin-shell.tsx:70`).
- Admin page content is rendered inside `<main className="flex-1 p-6">` (`apps/web/src/app/admin/admin-shell.tsx:153`).

## 3. Existing data-fetching and client API patterns used by admin pages

Server component upstream API fetch pattern:
- `apps/web/src/app/admin/layout.tsx:26-40` uses `cookies()` from `next/headers`, serializes cookies with `(await cookies()).toString()`, and forwards them as a `cookie` header when calling `${apiBase}/v1/me`.
- `apps/web/src/app/admin/layout.tsx:27` uses `process.env.API_URL || "http://localhost:3001"` as API base.
- `apps/web/src/app/admin/layout.tsx:30-33` uses `fetch(..., { cache: "no-store", headers })`.
- `apps/web/src/app/admin/page.tsx:29-43` repeats the same pattern for `${apiBase}/v1/admin/dashboard`.
- `apps/web/src/app/admin/sessions/page.tsx:21-34` repeats the same pattern for `${apiBase}/v1/admin/dashboard`.
- The server fetch helpers return `null` when `res.ok` is false or fetch throws (`apps/web/src/app/admin/layout.tsx:34-39`, `apps/web/src/app/admin/page.tsx:38-42`, `apps/web/src/app/admin/sessions/page.tsx:29-33`).

Client API helper pattern:
- `apps/web/src/lib/api.ts:1` is a client module.
- `apps/web/src/lib/api.ts:21` sets client API base to `/api/v1`.
- `apps/web/src/lib/api.ts:23-34` builds fetch requests with JSON content type, `credentials: "include"`, optional method/body/headers/signal.
- `apps/web/src/lib/api.ts:35-40` maps network failures to `{ ok: false, error: { code: "NETWORK_ERROR", message: "Reseau injoignable", status: 0 } }`.
- `apps/web/src/lib/api.ts:42-50` reads response text and attempts JSON parsing.
- `apps/web/src/lib/api.ts:52-61` treats non-OK HTTP responses or `{ success: false }` payloads as `ApiError`.
- `apps/web/src/lib/api.ts:63-65` unwraps a `{ data }` envelope when present.
- `apps/web/src/lib/api.ts:68-74` exports `apiGet`, `apiPost`, `apiPatch`, and `apiDelete`.
- `apps/web/src/app/admin/admin-shell.tsx:122-126` uses `apiPost("/auth/logout")` inside the logout form action.

Next rewrite pattern:
- `apps/web/next.config.ts:3` sets `apiUrl` from `process.env.API_URL ?? "http://localhost:3001"`.
- `apps/web/next.config.ts:6-13` rewrites `/api/v1/:path*` to `${apiUrl}/v1/:path*`.

Session hook pattern:
- `apps/web/src/lib/useSession.ts:37-91` provides a client `useSession()` hook with cached user state, `refresh`, `login`, `register`, and `logout`.
- `apps/web/src/lib/useSession.ts:42-54` refreshes from `/me` through the client API helper and clears cache on unauthenticated responses.
- `apps/web/src/lib/useSession.ts:67-83` logs in/registers through `/auth/login` and `/auth/register`.
- `apps/web/src/lib/useSession.ts:85-88` logs out through `/auth/logout`.

Error text helper:
- `apps/web/src/lib/errors.fr.ts:3-83` maps API error codes for auth, sessions, payments/wallet, live, rounds, minigames, and generic cases.
- `apps/web/src/lib/errors.fr.ts:99-101` exports `translateError(code, fallbackStatus)`.

## 4. Missing admin pages/routes visible from existing navigation or logs

Routes visible from existing admin navigation but missing matching App Router `page.tsx` files:

| Route | Visible from | Existing file check | Fact |
|---|---|---|---|
| `/admin/live` | `apps/web/src/app/admin/layout.tsx:10` | no `apps/web/src/app/admin/live/page.tsx` | Missing page route. |
| `/admin/payments` | `apps/web/src/app/admin/layout.tsx:11` | no `apps/web/src/app/admin/payments/page.tsx` | Missing page route. |
| `/admin/wallets` | `apps/web/src/app/admin/layout.tsx:12` | no `apps/web/src/app/admin/wallets/page.tsx` | Missing page route. |
| `/admin/users` | `apps/web/src/app/admin/layout.tsx:13` | no `apps/web/src/app/admin/users/page.tsx` | Missing page route. |
| `/admin/minigames` | `apps/web/src/app/admin/layout.tsx:14` | no `apps/web/src/app/admin/minigames/page.tsx` | Missing page route. |
| `/admin/audit` | `apps/web/src/app/admin/layout.tsx:15` | no `apps/web/src/app/admin/audit/page.tsx` | Missing page route. |
| `/admin/sessions/new` | `apps/web/src/app/admin/sessions/page.tsx:52-54` | no `apps/web/src/app/admin/sessions/new/page.tsx` | Missing page route. |

404 explanation from current codebase facts:
- The only admin child directory present is `apps/web/src/app/admin/sessions`; there are no directories for `live`, `payments`, `wallets`, `users`, `minigames`, `audit`, or `sessions/new`.
- The existing sidebar and CTA link to these paths, but the corresponding `page.tsx` files do not exist.
- Separately, `apps/web/src/app/admin/layout.tsx:42-46` intentionally returns `notFound()` for unauthenticated or unauthorized users, so even implemented admin pages return 404 for users outside `ADMIN`, `SUPER_ADMIN`, `FINANCE`, or `SUPPORT`.

Route/doc mismatch fact:
- Current sidebar links "Live control" to `/admin/live` (`apps/web/src/app/admin/layout.tsx:10`).
- Phase 3 documentation names the live control page as `/admin/sessions/[id]/live` (`docs/plan/19-phase3-operateur-lancement.md:222`).

## 5. Relevant UI component conventions

Admin page/component conventions:
- Admin pages use RetroUI `Badge`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, and `Button` imports (`apps/web/src/app/admin/page.tsx:3-4`, `apps/web/src/app/admin/sessions/page.tsx:3-5`).
- Dashboard KPI cards use `Card` composition and large numeric text (`apps/web/src/app/admin/page.tsx:45-55`).
- Admin section wrappers use utility classes such as `space-y-8`, `grid gap-4`, `sm:grid-cols-*`, and `lg:grid-cols-*` (`apps/web/src/app/admin/page.tsx:81-117`).
- Admin sessions page uses `space-y-6`, a heading/CTA flex row, `Badge variant="outline"`, and an empty-state `Card` (`apps/web/src/app/admin/sessions/page.tsx:41-67`).
- Admin navigation uses lucide icons through a string-to-component map (`apps/web/src/app/admin/admin-shell.tsx:5-16`, `apps/web/src/app/admin/admin-shell.tsx:46-55`).
- Sidebar menu labels truncate through `SidebarMenuButton` styles (`apps/web/src/components/retroui/sidebar.tsx:477-479`).

RetroUI primitive conventions:
- `Button` variants include `default`, `outline`, `secondary`, `ghost`, `destructive`, and `link` (`apps/web/src/components/retroui/button.tsx:9-21`).
- `Button` sizes include `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, and `icon-lg` (`apps/web/src/components/retroui/button.tsx:22-34`).
- `Card` uses `rounded border-2 bg-card py-(--card-spacing) text-sm text-card-foreground shadow-md` (`apps/web/src/components/retroui/card.tsx:5-19`).
- `Badge` variants include `default`, `secondary`, `destructive`, `outline`, `ghost`, and `link` (`apps/web/src/components/retroui/badge.tsx:7-28`).
- `SidebarProvider` stores collapsed/expanded state and writes the `sidebar_state` cookie (`apps/web/src/components/retroui/sidebar.tsx:56-89`).
- `Sidebar` supports mobile `Sheet` rendering and desktop fixed sidebar rendering (`apps/web/src/components/retroui/sidebar.tsx:152-252`).
- `SidebarTrigger` is a ghost `icon-sm` button with a `PanelLeftIcon` and an sr-only "Toggle Sidebar" label (`apps/web/src/components/retroui/sidebar.tsx:254-277`).

Program Builder conventions:
- `ProgramBuilder` is already located under `apps/web/src/components/admin/` and is not currently imported by any existing admin page in `apps/web/src/app/admin/**`.
- It uses `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for drag and drop (`apps/web/src/components/admin/ProgramBuilder.tsx:4-6`).
- It imports `simulateProgram` from `@session-jeu/game-engine` (`apps/web/src/components/admin/ProgramBuilder.tsx:7`) and uses it for funnel computation (`apps/web/src/components/admin/ProgramBuilder.tsx:108-114`).
- It uses a sticky side panel for funnel display (`apps/web/src/components/admin/ProgramBuilder.tsx:143-184`).

## Relevant tests found

| Path | Lines | Facts |
|---|---:|---|
| `apps/web/src/__tests__/pages.test.ts` | 4-12 | Static file list includes `src/app/admin/page.tsx`. |
| `apps/web/src/__tests__/pages.test.ts` | 43-46 | Test asserts `src/app/admin/page.tsx` contains `export default`. |
| `apps/web/src/__tests__/pages.test.ts` | 14-30 | Forbidden wording scan includes `src/app/admin/page.tsx`. |
| `apps/web/src/__tests__/design-system.test.ts` | 5-16 | Requires local RetroUI components including `badge`, `button`, `card`, `dialog`, `input`, `progress`, and `tabs`. |
| `apps/web/e2e/feature-01-catalogue-public.spec.ts` | 3-72 | Existing E2E spec covers public acquisition/catalogue/session detail only; no admin route is exercised in this file. |

Search fact:
- `rg` found no admin-specific E2E spec under `apps/web/e2e`.
- `rg` found no test reference for `/admin/live`, `/admin/payments`, `/admin/wallets`, `/admin/users`, `/admin/minigames`, `/admin/audit`, or `/admin/sessions/new` under `apps/web/src/__tests__` or `apps/web/e2e`.

## Local docs referencing admin UI/routes

| Path | Lines | Facts |
|---|---:|---|
| `docs/plan/19-phase3-operateur-lancement.md` | 13-17 | Sprint 3A-3E includes admin layout/sidebar/dashboard/list, Program Builder, live control, audit/support, polish, and final E2E recipe. |
| `docs/plan/19-phase3-operateur-lancement.md` | 21-25 | Phase 3 gate requires Context7 docs for Next 16 layouts/route groups/middleware, Sidebar, PixiJS, dnd-kit, and reading real admin API routes before coding pages. |
| `docs/plan/19-phase3-operateur-lancement.md` | 31-47 | Defines `/admin/layout.tsx`, server-side session check through `GET /v1/me`, non-admin 404, and a role matrix for Dashboard, Sessions, Live control, Payments, Wallets, Users, Minigames, and Audit logs. |
| `docs/plan/19-phase3-operateur-lancement.md` | 49-53 | Dashboard target includes KPI row, recent sessions table, and alert banner for critical signals. |
| `docs/plan/19-phase3-operateur-lancement.md` | 57-69 | Program Builder target is a 4-step session creation wizard. |
| `docs/plan/19-phase3-operateur-lancement.md` | 212-216 | Program Builder rules say `simulateProgram` comes from game-engine, minigames come from `GET /v1/admin/minigames`, and final validation stays server-side. |
| `docs/plan/19-phase3-operateur-lancement.md` | 222-236 | Defines live control, audit, and support admin pages/actions, including `/admin/sessions/[id]/live`, `/admin/audit`, and `/admin/users`. |
| `docs/plan/19-phase3-operateur-lancement.md` | 296-310 | Polish requires loading/empty/error/success states per route and final Playwright admin route covering create program, publish, pause/resume live, and audit trace. |
| `docs/plan/archive/22-ui-admin.md` | 1-6 | Archived admin UI plan says to transform the minimal admin dashboard into a complete operations interface connected to existing admin routes. |
| `docs/plan/archive/22-ui-admin.md` | 15-18 | Archived stories include dashboard KPIs, session creation/configuration/simulation/publication, live operations, and support search. |
| `docs/plan/archive/22-ui-admin.md` | 20-22 | Archived Definition of Done requires admin to configure, publish, supervise, and audit a session without direct database access, with RBAC tests by role. |
| `docs/plan/13-dashboard-admin-audit-support.md` | 24-32 | Story 13.1 requires `GET /v1/admin/dashboard`, KPIs, admin page, and role filtering. |
| `docs/plan/13-dashboard-admin-audit-support.md` | 39-47 | Story 13.2 requires `GET /v1/admin/audit-logs` and audit filters. |
| `docs/plan/13-dashboard-admin-audit-support.md` | 54-62 | Story 13.3 requires `GET /v1/admin/support/users/:id`, profile/registrations/payments/wallet summary, secret masking, and `SupportCase`. |
| `docs/plan/13-dashboard-admin-audit-support.md` | 84-95 | Definition of Done includes RBAC tests, dashboard/audit integration tests, provider secret masking, and support E2E. |
| `docs/prd/features/13-dashboard-admin-audit-support.md` | 22-28 | Feature 13 scope includes dashboard, support search, audit logs, sensitive actions with role/reason/audit, and approval workflow. |
| `docs/prd/features/13-dashboard-admin-audit-support.md` | 37-45 | Invariants specify sensitive actions require role/reason/audit; admins see sessions/payments/status/results/profitability; finance sees payments/ledger but not gameplay control. |
| `docs/prd/features/13-dashboard-admin-audit-support.md` | 56-63 | Contracts include `GET /v1/admin/dashboard`, `GET /v1/admin/audit-logs`, `GET /v1/admin/support/users/:id`, `POST /v1/admin/incidents`, `POST /v1/admin/actions/:id/approve`, and `POST /v1/admin/payments/:id/reconcile`. |
| `docs/plan/04-configuration-sessions-admin.md` | 39-47 | Story 4.2 requires `POST /v1/admin/sessions` to create DRAFT sessions with admin role and audit. |
| `docs/plan/04-configuration-sessions-admin.md` | 55-64 | Story 4.3 requires `GET /v1/admin/sessions/:id/simulation` and financial simulation display. |
| `docs/plan/04-configuration-sessions-admin.md` | 71-87 | Story 4.4 requires patch/publish routes, validation, paid-registration locking, and OCC. |
| `docs/plan/04-configuration-sessions-admin.md` | 88-100 | Definition of Done includes E2E admin create -> simulate -> publish session. |
| `docs/prd/features/04-configuration-sessions-admin.md` | 22-28 | Scope includes CRUD admin GameSession in DRAFT, economic/capacity/visibility/rounds config, simulation, publication/cancel with audit. |
| `docs/prd/features/04-configuration-sessions-admin.md` | 56-63 | Contracts include session create/update/publish/open/cancel/simulation admin routes. |
| `docs/plan/09-session-live-temps-reel.md` | 72-86 | Story 9.4 requires admin pause/resume routes and audit. |
| `docs/prd/features/09-session-live-temps-reel.md` | 57-63 | Live contracts include admin pause/resume and live state. |
| `docs/plan/11-catalogue-mini-jeux-configurables.md` | 39-46 | Story 11.2 requires admin minigames list, enable, validate-config, and round configuration integration. |
| `docs/prd/features/11-catalogue-mini-jeux-configurables.md` | 56-61 | Minigame contracts include `GET /v1/admin/minigames`, enable, validate-config, and public schema route. |
| `docs/plan/06-paiement-fapshi.md` | 78-84 | Payment reconciliation story requires admin reconcile endpoint and audit. |
| `docs/prd/features/06-paiement-fapshi.md` | 56-61 | Payment contracts include `POST /v1/admin/payments/:id/reconcile`. |
| `docs/plan/07-wallet-ledger-credits.md` | 72-80 | Wallet admin adjustment story requires finance/super admin role, reason, ledger, audit, and no real-money withdrawal in V1. |
| `docs/prd/features/07-wallet-ledger-credits.md` | 58-63 | Wallet contracts include `POST /v1/admin/wallets/:userId/adjust`. |
