# Agent 05: Codebase Session Admin Flow

## 1. Existing Session Admin Capabilities

### API Routes (all under `/v1/admin/`)

| Route | File : Line | Method | Roles | Action |
|---|---|---|---|---|
| `/sessions` | `apps/api/src/routes/admin/sessions.ts:176` | POST | ADMIN, SUPER_ADMIN | Create DRAFT session |
| `/sessions` | `sessions.ts:236` | GET | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | List sessions (paginated, filterable by status) |
| `/sessions/:id` | `sessions.ts:283` | GET | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | Get session detail (+ registrations, rounds, liveState, results, commission, disputeWindow) |
| `/sessions/:id` | `sessions.ts:410` | PATCH | ADMIN, SUPER_ADMIN | Update session config (OCC via configVersion) |
| `/sessions/:id/publish` | `sessions.ts:550` | POST | ADMIN, SUPER_ADMIN | Publish session (DRAFT → PUBLISHED, with compliance gate check) |
| `/sessions/:id/open-registration` | `sessions.ts:619` | POST | ADMIN, SUPER_ADMIN | Open registration (PUBLISHED → ACTIVE) |
| `/sessions/:id/cancel` | `sessions.ts:674` | POST | ADMIN, SUPER_ADMIN | Cancel session (any status → CANCELLED, except COMPLETED) |
| `/sessions/:id/simulation` | `sessions.ts:378` | GET | ADMIN, SUPER_ADMIN | Financial simulation (live XAF calc) |
| `/sessions/:id/start` | `lobby.ts:16` | POST | ADMIN, SUPER_ADMIN | Start session (ACTIVE/WAITING_START → LIVE, checks min checked-in) |
| `/live/:sessionId/pause` | `live.ts:22` | POST | ADMIN, SUPER_ADMIN | Pause live session |
| `/live/:sessionId/resume` | `live.ts:51` | POST | ADMIN, SUPER_ADMIN | Resume paused live session |
| `/sessions/:id/results` | `results.ts:28` | GET | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Get session results + distributions + commission + disputeWindow |
| `/sessions/:id/finalize` | `results.ts:51` | POST | ADMIN, SUPER_ADMIN | Finalize results + trigger credit distribution |
| `/sessions/:id/correction-request` | `results.ts:102` | POST | ADMIN, SUPER_ADMIN, SUPPORT | Request results correction |
| `/dashboard` | `operations.ts:35` | GET | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Admin dashboard KPIs |

### Business Logic Services

| File | Lines | Purpose |
|---|---|---|
| `apps/api/src/admin/sessionConfig.ts` | 1–223 | Zod schemas for create/update, `calculateSessionFinancials`, `generateSessionCode`, `sensitiveAdminSessionFields`, validation helpers |
| `apps/api/src/lobby/lobby.ts` | 269–339 | `authorizeSessionStart` — validates session status, checked-in count ≥ minPlayers, transitions to LIVE, writes audit log |
| `apps/api/src/live/live.ts` | 70–357 | `createLiveReservation`, `consumeLiveReservation`, `pauseLiveSession`, `resumeLiveSession`, `serializeLiveSessionState` |
| `apps/api/src/results/results.ts` | 1–703 | `calculatePrizeDistribution`, `getSessionResultsForAdmin`, `finalizeSessionResults`, `requestResultsCorrection` |

### Session Status Lifecycle

`DRAFT` → `PUBLISHED` → `ACTIVE` → `LIVE` → `COMPLETED` (or `CANCELLED` from any non-COMPLETED)

- **Create**: Always DRAFT (sessionConfig.ts:199)
- **Publish**: DRAFT → PUBLISHED (sessions.ts:573)
- **Open registration**: PUBLISHED → ACTIVE (sessions.ts:638)
- **Start**: ACTIVE/WAITING_START → LIVE (lobby.ts:315)
- **Cancel**: Any → CANCELLED, except COMPLETED → 409 (sessions.ts:687)

---

## 2. Request/Response Shapes

### POST /v1/admin/sessions (Create)
**Request** (createAdminSessionSchema, sessionConfig.ts:18):
```ts
{
  code?: string;              // min 3, max 64, /^[A-Z0-9-]+$/
  name: string;               // min 3, max 120
  description?: string;       // max 1000
  minPlayers: number;         // min 2, default 2
  maxPlayers: number;         // min 2, default 10
  entryFeeXaf: number;        // min 100, max 100_000_000
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";  // default "PRIVATE"
  prizePoolBps: number;       // 0–10000, default 6000
  winnerSplitBps: number[];   // 1–10 items, sum=10000, default [10000]
  providerFeeBps: number;     // 0–10000, default 300
  startsAt?: string;          // ISO datetime, must be future
  registrationClosesAt?: string; // ISO datetime, must be ≤ startsAt
  reason?: string;            // min 3, max 500
}
```

**Response** (201): `{ success: true, data: { session: SerializedSession } }`

### PATCH /v1/admin/sessions/:id (Update)
**Request** (updateAdminSessionSchema, sessionConfig.ts:45):
```ts
{
  expectedConfigVersion: number;  // required — OCC guard
  name?: string;
  description?: string | null;
  minPlayers?: number;
  maxPlayers?: number;
  entryFeeXaf?: number;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  prizePoolBps?: number;
  winnerSplitBps?: number[];
  providerFeeBps?: number;
  startsAt?: string | null;
  registrationClosesAt?: string | null;
  reason: string;  // required for updates
}
```

**Error codes**: `SESSION_NOT_FOUND` (404), `PAID_REGISTRATIONS_EXIST` (409 — sensitive fields locked after paid registrations), `CONFIG_VERSION_CONFLICT` (409), `INVALID_*` (400)

### POST /v1/admin/sessions/:id/publish
**Request** (versionedActionSchema, sessionConfig.ts:76):
```ts
{
  expectedConfigVersion: number;
  reason: string;  // min 3, max 500
}
```
**Validation gates**: capacity, entry fee, BPS ranges, winner split sum, start time, registration close time, compliance gate.

### POST /v1/admin/sessions/:id/open-registration
**Request**: same versionedActionSchema. Requires status === PUBLISHED.

### POST /v1/admin/sessions/:id/cancel
**Request** (cancelSessionSchema, sessionConfig.ts:81): same shape. Rejects COMPLETED sessions.

### POST /v1/admin/sessions/:id/start
**Request**: none (just auth + sessionId param). Delegates to `authorizeSessionStart` in lobby.ts:269. Error codes: `SESSION_NOT_FOUND`, `SESSION_CANCELLED`, `SESSION_NOT_STARTABLE` (not ACTIVE/WAITING_START), `MIN_PLAYERS_NOT_REACHED`.

### POST /v1/admin/live/:sessionId/pause
**Request**: `{ reason: string }` (min 3, max 500). Delegates to `pauseLiveSession` in live.ts.

### POST /v1/admin/live/:sessionId/resume
**Request**: none (just param). Delegates to `resumeLiveSession` in live.ts.

### POST /v1/admin/sessions/:id/finalize
**Request** (finalizeSessionSchema, results.ts:23):
```ts
{
  tiePolicy?: "USER_ID_ASC";
  remainderPolicy?: "FIRST_WINNER" | "PLATFORM_COMMISSION";  // default "FIRST_WINNER"
  reason?: string;
}
```
Triggers `recomputeSessionPlayerStats` + `scheduleCreditsDistribution`.

### POST /v1/admin/sessions/:id/correction-request
**Request**: `{ reason: string }`. Requires finalized session.

### SerializedSession shape (serializeSession, sessions.ts:71)
```ts
{
  id, code, name, description, status, minPlayers, maxPlayers,
  entryFeeXaf, visibility, prizePoolBps, winnerSplitBps, providerFeeBps,
  configVersion, startsAt, registrationClosesAt, publishedAt,
  cancelledAt, cancellationReason, createdBy
}
```
GET detail enriches with: `registrations[]`, `rounds[]`, `liveState`, `results[]`, `commissionRecord`, `disputeWindow`.

---

## 3. Current Web Session Admin UI Behavior

### Dashboard (`/admin/page.tsx`)
- Server component fetches `GET /v1/admin/dashboard` (line 34)
- Displays KPI cards for sessions, registrations, incidents, support cases, finance
- Shows "Acces admin requis" card if fetch fails or unauthorized

### Sessions List (`/admin/sessions/page.tsx`)
- Server component fetches `GET /v1/admin/dashboard` (line 25) — **note: this fetches dashboard, not session list**
- Displays summary counts (total, live, completed)
- Button "+ Nouvelle session" linking to `/admin/sessions/new`
- Card with placeholder text: "Les sessions apparaîtront ici. Utilise le Program Builder pour créer une session structurée."

### Admin Layout (`/admin/layout.tsx`)
- Server-side auth check via `GET /v1/me`, calls `notFound()` if unauthorized
- RBAC-filtered sidebar with 8 entries (Dashboard, Sessions, Live control, Paiements, Wallets, Utilisateurs, Mini-jeux, Audit logs)
- Each entry has `roles` (full access) and `viewRoles` (read-only)

### ProgramBuilder (`/admin/ProgramBuilder.tsx`) — Client Component
- Drag-and-drop round ordering via `@dnd-kit`
- Visual funnel simulation via `simulateProgram` from `@session-jeu/game-engine`
- `RoundDraft` type with localId, miniGame, configJson, durationMs, policy
- Coherence badge (green/red) indicating if program funnel fits winnersCount
- Sticky sidebar with max/min player funnel visualization
- `onAddRound` and `onEditRound` callbacks (not wired to any route/API yet)

### What's missing in the Web UI
- **No `/admin/sessions/new` page**: the "+ Nouvelle session" link (`/admin/sessions/new`) leads to nothing (no directory found)
- **No `/admin/sessions/[id]` pages**: no detail/edit/live/finalize pages exist
- **No `/admin/live` page**: sidebar entry exists but no route
- **No `/admin/audit` page**: sidebar entry exists but no route
- **No `/admin/users` page**: sidebar entry exists but no route
- **No `/admin/payments` page**: sidebar entry exists but no route
- **No `/admin/wallets` page**: sidebar entry exists but no route
- **No `/admin/minigames` page**: sidebar entry exists but no route

---

## 4. Missing Pieces Indicated by 404 Logs or Docs

### From Feature Docs
- Feature 13 dashboard admin (13-dashboard-admin-audit-support.md): lists routes like `GET /v1/admin/operations/audit-logs`, `POST /v1/admin/operations/incidents`, `POST /v1/admin/operations/actions/:id/approve` — these all **exist** in `operations.ts`
- Feature 09 (09-session-live-temps-reel.md): mentions `GET /v1/live/:sessionId/state` — exists
- Feature 08 (08-lobby-check-in.md): `POST /v1/admin/sessions/:id/start` — exists

### From Sprint 3C of Plan (19-phase3-operateur-lancement.md)
- **Live control page** (`/admin/sessions/[id]/live`): monitor with 5s polling, pause/resume/finalize actions — not implemented
- **Audit page** (`/admin/audit`): DataTable with filters (period, action, entityId, requestId), detail Sheet — not implemented
- **Support users page** (`/admin/users`): search, profile/registrations/payments/wallet tabs — not implemented
- **Payment reconciliation** and **wallet adjustment** pages — not implemented

### From Web UI Sessions List
- `getDashboard()` on sessions page fetches wrong endpoint (should probably fetch sessions list, not dashboard). The sessions list table body shows only placeholder text.

### API Missing
- No `GET /v1/admin/sessions/:id/rounds` endpoint (rounds are embedded in GET session detail)
- No dedicated "create round" or "bulk update rounds" endpoint — rounds seem to be managed through ProgramBuilder but not wired to any API route yet
- No `winnersCount` field in `GameSession` model (the plan mentions it as a config concept, but the DB schema doesn't expose it directly — it's derived from winnerSplitBps length)

---

## 5. Test Coverage Already Present

| Test File | Lines | Coverage |
|---|---|---|
| `apps/api/src/admin/__tests__/sessionConfig.test.ts` | 68 | Unit tests for `calculateSessionFinancials`, schema validation (capacity, winner split, timing), `generateSessionCode` |
| `apps/api/src/routes/__tests__/admin-sessions.test.ts` | 465 | Create DRAFT (201), player access denied (403), financial simulation (200), config update with OCC (200), configVersion conflict (409), paid-registration lock (409), publish (200), compliance gate block (403), invalid publish (400), open registration (200), cancel (200) |
| `apps/api/src/routes/__tests__/admin-lobby.test.ts` | 126 | Admin start session (200), min players not reached (409), player role denied (403) |
| `apps/api/src/routes/__tests__/admin-live.test.ts` | 146 | Pause (200), resume (200), non-admin denied (403) |
| `apps/api/src/routes/__tests__/admin-results.test.ts` | 220 | Finalize (201), tie policy validation (422), non-admin denied (403), correction request (200) |
| `apps/api/src/routes/__tests__/admin-operations.test.ts` | (exists) | Dashboard KPIs, support role scope, player rejection |

### Test Coverage Gaps

- **No round management tests** in admin context
- **No ProgramBuilder → API wiring tests** (the web component exists but no E2E or integration test)
- **No admin session detail page tests** (page doesn't exist yet)
- **No live control page tests** (page doesn't exist yet)
- **No concurrent session tests** for race conditions on start/finalize
- **Web UI tests** (Playwright) not found — referenced in plan (Sprint 3E recette) but not implemented yet

### Summary

The **API layer is complete** for the full session admin lifecycle (CRUD, publish, cancel, start, pause/resume live, finalize, result correction, dashboard, audit logs, support). The **Web UI is minimal**: only dashboard and a sessions list placeholder exist. The **ProgramBuilder component** is built but not connected to any page or API. All remaining admin pages referenced in the sidebar are unimplemented.
