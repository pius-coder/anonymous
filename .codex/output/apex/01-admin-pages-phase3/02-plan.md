# Implementation Plan: Phase 3 Admin Pages (All 7 Missing Pages + Program Builder)

## Overview
Create all 7 missing admin pages that currently return 404, plus the Program Builder 4-step wizard for session creation. The admin layout, sidebar (RBAC), and dashboard already exist. We need to implement the actual page components wired to the existing API endpoints.

## Prerequisites
- [x] Admin layout with auth check (`/admin/layout.tsx`) - exists
- [x] AdminShell with sidebar RBAC filtering - exists
- [x] Dashboard page (`/admin/page.tsx`) - exists
- [x] Sessions list page (`/admin/sessions/page.tsx`) - exists (needs enhancement for CRUD)
- [x] All admin API routes exist and tested
- [x] RetroUI components available (Table, Pagination, Badge, Card, Button, Dialog, Sheet, etc.)

---

## File Changes

### 1. `apps/web/src/app/admin/sessions/page.tsx` (ENHANCE)
**Current state**: Placeholder listing with dashboard counts + link to `/admin/sessions/new`
**Required**: Full session CRUD list with DataTable, pagination, status badges, quick actions

**Changes**:
- Add `Table` component with columns: Code, Name, Status (Badge), Visibility, Players (current/max), Entry Fee, Created, Actions
- Add `Pagination` for cursor-based pagination (or page-based matching API)
- Add "Créer session" button → `/admin/sessions/new`
- Row actions: "Voir" (detail), "Modifier" (edit), "Publier" (if DRAFT), "Annuler" (if PUBLISHED/ACTIVE)
- Server component with cookie forwarding to `GET /v1/admin/sessions` (new endpoint needed) + dashboard counts
- Loading state: `Skeleton` rows; Empty state: `Empty` component
- Role-based action visibility: FINANCE/SUPPORT see read-only; ADMIN/SUPER_ADMIN see all actions

**API to call**: Need to add `GET /v1/admin/sessions` (list with pagination) to `admin/sessions.ts` - currently only POST/GET-by-id/PATCH/POST-publish/POST-cancel exist. **This is a gap** - need to add list endpoint.

---

### 2. `apps/web/src/app/admin/sessions/new/page.tsx` (NEW - Program Builder Step 1: General)
**Route**: `/admin/sessions/new` - Step 1 of 4-step wizard (Sheet large)

**Component structure**:
- Wrapper: `Sheet` (large, open by default) with `SheetContent`, `SheetHeader` (step indicator), `SheetFooter` (Prev/Next)
- Step 1 form fields:
  - `name` (required, max 120)
  - `description` (textarea, optional)
  - `startsAt` (date-time picker)
  - `registrationClosesAt` (date-time picker, optional, ≤ startsAt)
  - `visibility` (Select: PUBLIC/UNLISTED/PRIVATE)
  - `minPlayers` (number, min 2, default 2)
  - `maxPlayers` (number, min minPlayers, default 10)
- Validation on Next click (client-side mirror of server invariants)
- State persisted across steps (use `useReducer` or context)

**Navigation**: Next → `/admin/sessions/new?step=2` (or same page with step state)

---

### 3. `apps/web/src/app/admin/sessions/new/economy/page.tsx` (NEW - Step 2: Economy)
**Route**: `/admin/sessions/new?step=2` (or `/admin/sessions/new/economy`)

**Form fields**:
- `entryFeeXaf` (number, min 100, step 50)
- `prizePoolBps` (number, 0-10000, default 6000)
- `winnerSplitBps` (dynamic array of numbers summing to 10000; `winnersCount` drives length)
- `winnersCount` (number, 1 to maxPlayers)
- `providerFeeBps` (number, default 300)
- **Live financial simulation card** (read-only, updates on every input):
  - Gross collection (entryFee × maxPlayers)
  - Estimated fees (providerFeeBps)
  - Net collection
  - Prize pool (net × prizePoolBps/10000)
  - Winner share (prizePool / winnersCount × winnerSplitBps[i])
  - Organization commission
  - Min/max revenue (at minPlayers / maxPlayers)
  - Risk warnings (if minPlayers not met, etc.)

**API**: Client-side only (mirrors `calculateSessionFinancials` from `@session-jeu/game-engine`)

---

### 4. `apps/web/src/app/admin/sessions/new/program/page.tsx` (NEW - Step 3: Program Builder)
**Route**: `/admin/sessions/new?step=3` (or `/admin/sessions/new/program`)

**Core component**: `ProgramBuilder` (drag-drop round list + funnel simulation)

**Imports**: `@session-jeu/game-engine/simulateProgram`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**UI**:
- Left column: `SortableContext` with `SortableRoundCard` per round
  - Each card: drag handle, mini-game badge (family color), name, config summary (from `configSchema`), policy badge, duration, remove button
  - "Ajouter un round" button → opens `AddRoundDialog`
- Right sticky column: Funnel simulation
  - Calls `simulateProgram(maxPlayers, policies)` and `simulateProgram(minPlayers, policies)`
  - Shows step-by-step attrition: "Départ: N → Round 1: N₁ → Round 2: N₂ → ... → Final: N_f"
  - Green if `final ≥ winnersCount`, red otherwise
  - Odd-player warning for DUEL rounds

**AddRoundDialog** (Sheet):
- Tabs by family: SOLO, DUEL, SURVIVAL
- Game list from `GET /v1/admin/minigames` (filter `enabled=true`)
- Select game → config form **generated from `configSchema`** (number→Input type=number with min/max, string→Input, boolean→Switch, enum→Select)
- Policy Select filtered by `FAMILY_POLICIES` from game-engine
- Submit → adds `RoundDraft` to list with `localId`

**State**: Array of `RoundDraft { localId, miniGameId, miniGameKey, name, family, configJson, durationMs, policy }`

---

### 5. `apps/web/src/app/admin/sessions/new/review/page.tsx` (NEW - Step 4: Review & Publish)
**Route**: `/admin/sessions/new?step=4` (or `/admin/sessions/new/review`)

**Display**: Full read-only recap of all 3 steps
- General: name, dates, visibility, capacity
- Economy: fees, prize pool, winner splits, simulation
- Program: round list with funnel (min/max)
- **Invariants checklist** (all green to enable Publish):
  - ☑ minPlayers ≥ 2
  - ☑ entryFeeXaf ≥ 100
  - ☑ sum(winnerSplitBps) = 10000
  - ☑ funnel final ≥ winnersCount (for both min/max)
  - ☑ at least 1 round
- Publish button: `AlertDialog` with mandatory `reason` Textarea → calls `POST /v1/admin/sessions` (create) then `POST /v1/admin/sessions/:id/publish` with version + reason
- On success: toast + redirect to `/admin/sessions/:id` (detail) or `/admin/sessions`

---

### 6. `apps/web/src/app/admin/live/page.tsx` (NEW - Live Control Monitor)
**Route**: `/admin/live`

**Server component**: fetch live sessions via `GET /v1/admin/dashboard` (has `sessions.live` count) + list? Need `GET /v1/admin/sessions?status=LIVE` - **gap**

**Client component** (`LiveMonitor.tsx`):
- Polling every 5s: `GET /v1/live/:sessionId/state` for each live session
- Display per session: phase badge, current round + `CountdownRing` (reuse from player live), player table (connection status, submitted, reconnectUntil), real vs predicted funnel
- Actions per session: Pause (AlertDialog + reason Textarea → `POST /v1/admin/live/:id/pause`), Resume (AlertDialog + reason → `POST /v1/admin/live/:id/resume`), Finalize (AlertDialog + reason → `POST /v1/admin/sessions/:id/finalize`), Create Incident (Sheet → `POST /v1/admin/incidents`)
- Role gate: ADMIN/SUPER_ADMIN only (SUPPORT read-only)

---

### 7. `apps/web/src/app/admin/payments/page.tsx` (NEW - Payment Reconciliation)
**Route**: `/admin/payments`

**Server component**: fetch payments with filters via `GET /v1/admin/payments?status=&page=&limit=` - **need to check if list endpoint exists** (currently only reconcile POST exists)

**Client component** (`PaymentsTable.tsx`):
- Table: ID, Session, User, Amount XAF, Status (Badge), Provider, Created, Actions
- Filters: status Select (PENDING/SUCCESSFUL/FAILED/EXPIRED/REFUNDED), date range, search by session/user
- Row action: "Rapprocher" (AlertDialog + reason Textarea → `POST /v1/admin/payments/:id/reconcile`)
- Pagination
- Role: FINANCE/SUPER_ADMIN full; ADMIN read-only

---

### 8. `apps/web/src/app/admin/wallets/page.tsx` (NEW - Wallet Adjustments)
**Route**: `/admin/wallets`

**Server component**: fetch users with wallets? Or client-side search via `GET /v1/admin/support/users/:id` for lookup

**Client component** (`WalletAdjustments.tsx`):
- Search user by ID/email (Command ⌘K style using `Command` from RetroUI)
- Selected user card: email, role, current balance, frozen status, ledger preview (last 10 entries)
- Adjustment form (Sheet): amountXaf (positive int), direction (CREDIT/DEBIT radio), type (BONUS/REFUND/ADJUSTMENT), reason (Textarea, min 3 chars), idempotencyKey (auto-gen, editable), retype amount confirmation
- Submit → `POST /v1/admin/wallets/:userId/adjust` → toast + refresh
- Role: FINANCE/SUPER_ADMIN only

---

### 9. `apps/web/src/app/admin/users/page.tsx` (NEW - Support User View)
**Route**: `/admin/users`

**Server component**: none needed (client-side search)

**Client component** (`UserSupportView.tsx`):
- `Command` search (⌘K) by user ID/email/name
- Tabs: Profile | Registrations | Payments | Wallet Ledger
- Profile tab: email, name, role, isActive, createdAt, avatar
- Registrations: table of sessions with status, payment status
- Payments: table with providerTransId **truncated** (mask: `fap_…3f9`), status, amount
- Wallet: balance, frozen, ledger table (amount, direction, type, description, createdAt)
- Actions per role:
  - FINANCE: "Rapprocher paiement" button on payment row
  - FINANCE/SUPER_ADMIN: "Ajuster wallet" button → opens WalletAdjustment Sheet (reuses component from /admin/wallets)
  - ADMIN/SUPER_ADMIN/SUPPORT: "Créer incident" button
- Masking: never show full `providerTransId`, `providerExternalId`, `checkoutUrl`, `metadata`, `webhook` payload

---

### 10. `apps/web/src/app/admin/minigames/page.tsx` (NEW - Mini-Game Management)
**Route**: `/admin/minigames`

**Server component**: fetch `GET /v1/admin/minigames` (cookie forwarding) - list all definitions

**Client component** (`MiniGamesTable.tsx`):
- Table: Key, Name, Family, PlayerMode, Resolver, Version, Enabled (toggle switch), Actions
- Toggle: `POST /v1/admin/minigames/:id/enable` with `{ enabled: boolean }`
- "Valider config" button → Sheet with config JSON input → `POST /v1/admin/minigames/validate-config` → show result
- Role: ADMIN/SUPER_ADMIN only (FINANCE/SUPPORT no access)

---

### 11. `apps/web/src/app/admin/audit/page.tsx` (NEW - Audit Logs)
**Route**: `/admin/audit`

**Server component**: fetch first page `GET /v1/admin/audit-logs?limit=20` (cookie forwarding)

**Client component** (`AuditLogsTable.tsx`):
- Table with columns: Date, Actor (ID + email), Action, Entity, EntityId, RequestId
- Filters (sticky top): DatePicker range, Combobox action (from distinct actions), Input entityId, Input requestId
- Row click → `Sheet` detail: actor, before/after JSON diff (2 columns: red for removed, green for added), hashed IP, userAgent, copyable requestId
- Pagination: cursor-based (`nextCursor` from API)
- Role: ADMIN/SUPER_ADMIN/FINANCE/SUPPORT (all see, no delete button)
- **Test requirement**: No delete button exists; Playwright verifies absence

---

### 12. `apps/web/src/app/admin/sessions/[id]/page.tsx` (NEW - Session Detail)
**Route**: `/admin/sessions/[id]`

**Server component**: fetch session detail via `GET /v1/admin/sessions/:id` (need to check if exists - currently only simulation endpoint has GET by id)

**Tabs**: General | Economy | Program | Registrations | Live | Results | Audit
- General: all config fields, status badge, publish/cancel buttons (versioned)
- Economy: simulation card (read-only), edit button → economy edit sheet
- Program: round list with funnel, reorder (if DRAFT), add/edit/remove rounds
- Registrations: table with user, status, payment, check-in
- Live: embedded live monitor for this session (if live)
- Results: results table + finalize/correction buttons
- Audit: session-scoped audit log entries

---

### 13. API Gap: Add `GET /v1/admin/sessions` (list with pagination)
**File**: `apps/api/src/routes/admin/sessions.ts`

**Add**: 
```ts
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "WAITING_START", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
});

sessions.get("/", zValidator("query", listQuerySchema), requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT"), async (c) => {
  // pagination + filter by status
  // return { data: SessionSummary[], meta: { total, page, limit, totalPages } }
});
```

**Response shape**: Match `SessionSummary` from tests (id, code, name, status, visibility, min/max players, entryFeeXaf, startsAt, registrationClosesAt, createdBy, createdAt, paidRegistrationsCount)

---

### 14. API Gap: Add `GET /v1/admin/sessions/:id` (detail)
**File**: `apps/api/src/routes/admin/sessions.ts`

**Add**: GET by id returning full session with registrations, rounds, liveState, results, commissionRecord

---

### 15. API Gap: Add `GET /v1/admin/payments` (list with filters)
**File**: `apps/api/src/routes/admin/payments.ts`

**Add**: GET with query filters (status, page, limit, sessionId, userId) returning paginated payments

---

### 16. Shared Components to Create
| Component | Path | Purpose |
|-----------|------|---------|
| `SessionStatusBadge` | `components/admin/SessionStatusBadge.tsx` | Badge with color per GameSessionStatus |
| `VisibilityBadge` | `components/admin/VisibilityBadge.tsx` | Badge for PUBLIC/UNLISTED/PRIVATE |
| `MoneyXAF` | `components/admin/MoneyXAF.tsx` | Formats number as "1 234 XAF" |
| `CountdownRing` | `components/admin/CountdownRing.tsx` | Circular countdown (reuse from player live) |
| `FinancialSimulation` | `components/admin/FinancialSimulation.tsx` | Live simulation card for economy step |
| `AddRoundDialog` | `components/admin/AddRoundDialog.tsx` | Sheet for adding round in ProgramBuilder |
| `ConfigFormGenerator` | `components/admin/ConfigFormGenerator.tsx` | Generates form from configSchema JSON |
| `MaskedProviderTransId` | `components/admin/MaskedProviderTransId.tsx` | Shows `fap_…3f9` style truncation |
| `AdminDataTable` | `components/admin/AdminDataTable.tsx` | Wrapper: Table + Pagination + Empty + Skeleton |
| `AdminPageLayout` | `components/admin/AdminPageLayout.tsx` | Consistent page header + actions + breadcrumb |

---

## Testing Strategy

### New Tests (API)
- `admin-sessions.test.ts`: Add tests for `GET /v1/admin/sessions` (list, pagination, filter), `GET /v1/admin/sessions/:id`
- `admin-payments.test.ts`: Add tests for `GET /v1/admin/payments` (list, filters)
- All new pages need integration tests hitting the API

### New Tests (UI - Playwright)
Per Phase 3 Definition of Done:
- Negative RBAC test per role per page (7 pages × 4 roles = 28 tests)
- Empty reason blocked on all sensitive actions
- Audit written for every action (verify via audit API)
- Secrets absent from DOM (`page.content()` must not contain full providerTransId)

### Unit Tests
- `simulateProgram` from game-engine (already tested in game-engine package)
- `ConfigFormGenerator` rendering from various configSchema shapes
- `FinancialSimulation` calculations match server `calculateSessionFinancials`

---

## Acceptance Criteria Mapping

| AC | Satisfied By |
|----|--------------|
| All 7 admin sidebar links resolve to working pages | Files 1, 6-11 |
| Session CRUD with list, create, edit, publish, cancel | Files 1, 2-5, 12-14 |
| Program Builder: 4-step wizard with validation, drag-drop, funnel | Files 2-5 |
| Live control: monitor, pause/resume/finalize with reason | File 6 |
| Payment reconciliation table with filter + reconcile action | File 7 |
| Wallet adjustment with reason + retype confirmation | File 8 |
| Support user view with tabs, masking, role actions | File 9 |
| Mini-game list with enable/disable + config validation | File 10 |
| Audit logs table with filters, diff detail, no delete | File 11 |
| All pages: 4 states (loading/empty/error/success) | All files |
| All pages: a11y (focus ring, aria-live on toasts, contrast) | All files |
| Negative RBAC tests per role per page | Test strategy |

---

## Risks & Considerations

1. **API gaps**: Need to add 3 list endpoints (sessions, sessions/:id detail, payments) - coordinate with API tests
2. **ConfigFormGenerator complexity**: Must handle all JSON Schema types (string, number, boolean, enum, array) + validation from schema
3. **ProgramBuilder drag-drop**: `@dnd-kit` v6 API; ensure SSR-safe (dynamic import or "use client")
4. **Financial simulation**: Must exactly match `calculateSessionFinancials` from game-engine (import from `@session-jeu/game-engine`)
5. **Real-time feel for Live monitor**: 5s polling acceptable per spec; no WebSocket needed in V1
6. **Masking**: Centralize `MaskedProviderTransId` component to ensure consistent truncation everywhere
7. **Role matrix**: UI filtering in sidebar is comfort; API middleware is source of truth. Tests must verify both.

---

## Execution Order

1. **API gaps first** (13, 14, 15) - unblock all pages
2. **Shared components** (16) - reusable building blocks
3. **Core pages** (1, 6, 7, 8, 9, 10, 11) - 7 pages in parallel-ish
4. **Program Builder wizard** (2, 3, 4, 5) - most complex, depends on shared components
5. **Session detail** (12) - depends on API gap 14
6. **Tests** - run in CI, fix failures
7. **Validate**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

---

## Estimated Files to Create/Modify

| Category | Count |
|----------|-------|
| New page files | 12 |
| New shared components | 10 |
| API route modifications | 3 |
| API test additions | 3 |
| Playwright test files | 7+ |
| **Total new/modified** | **~35** |

---

## Next Step

Proceed to execution (step-03). Begin with API gap endpoints, then shared components, then pages in parallel where possible.