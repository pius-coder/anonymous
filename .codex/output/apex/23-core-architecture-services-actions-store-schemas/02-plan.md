# Plan: Core Architecture (services/actions/store/schemas/hooks/types/constants)

## Overview

Create the foundational directory structure and files for a clean API service layer in `apps/web/src`. This replaces ad-hoc inline cookie forwarding (3 files) with an abstract `BaseApiService`, domain-specific service classes, server actions, zustand stores, Zod schemas, typed constants/enums/hooks.

**Scope:** Core architecture only. Page/component migration is deferred to next PR (Plan B).

---

## Prerequisites

- [x] Analysis complete: 3 inline cookie→fetch patterns identified, API endpoints documented, cookie config understood
- [x] Zod v4.4.3 already installed in `apps/web`
- [ ] Install `zustand` in `apps/web`

---

## File Changes

### Phase 1: Foundation (no breaking changes)

#### `apps/web/package.json`
- Add dependency: `zustand` (latest)

#### `apps/web/src/services/api/BaseApiService.ts` (NEW)
- Abstract base class for all API service classes
- Protected abstract method: `getCookieHeader(): Promise<string | null>` — each service provides its own cookie access
- Protected helpers:
  - `getApiBase()` — returns `process.env.API_URL || "http://localhost:3001"`
  - `buildUrl(path, params?)` — appends query string using `URLSearchParams`
  - `request<T>(method, path, opts?)` — core fetch wrapper:
    1. Get cookie header from subclass
    2. Build URL, set headers (content-type + cookie)
    3. Execute fetch with `cache: "no-store"`
    4. Parse JSON response
    5. Validate with optional Zod schema
    6. Return typed `T` or throw `ApiError`
  - `get<T>(path, params?)` → `request<T>("GET", ...)`
  - `post<T>(path, body?)` → `request<T>("POST", ...)`
  - `patch<T>(path, body?)` → `request<T>("PATCH", ...)`
  - `del<T>(path)` → `request<T>("DELETE", ...)`
- Response handling:
  - Parse `{ success: true, data: T }` envelope
  - Throw `ApiError` on failure with code, message, details
  - Optional Zod schema validation via `.parse()` (throws on mismatch)

#### `apps/web/src/services/api/errors.ts` (NEW)
- `ApiError` class extending `Error`
- Fields: `code: string`, `message: string`, `status: number`, `details?: Record<string, string[] | unknown>`
- Static factory: `fromResponse(res, body)` — parse API error envelope

#### `apps/web/src/services/auth/AuthService.ts` (NEW)
- Extends `BaseApiService`
- `getCookieHeader()` — calls `(await cookies()).toString()` from `next/headers`
- Methods:
  - `register(input)` → POST `/v1/auth/register`
  - `login(input)` → POST `/v1/auth/login`
  - `logout()` → POST `/v1/auth/logout` (requireAuth)
  - `getMe()` → GET `/v1/me`
- Input types imported from schemas

#### `apps/web/src/services/auth/types.ts` (NEW)
- `SessionUser` — id, email, name, role, username?
- `AuthInput` — email, password
- `RegisterInput` — email, password, username, name?, phone?
- `MeResponse` — `{ user: SessionUser }`

#### `apps/web/src/services/sessions/SessionService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `getCatalogue(params?)` → GET `/v1/public/sessions?...` (public, no auth needed)
  - `getDetail(code)` → GET `/v1/public/sessions/${code}` (public)
  - `register(sessionId)` → POST `/v1/sessions/${id}/register`
  - `getRegistration(sessionId)` → GET `/v1/sessions/${id}/registration`
  - `cancelRegistration(id)` → POST `/v1/registrations/${id}/cancel`
  - `getLobby(sessionId)` → GET `/v1/sessions/${id}/lobby`
  - `getJoinToken(sessionId)` → GET `/v1/sessions/${id}/join-token`
  - `checkIn(sessionId)` → POST `/v1/sessions/${id}/check-in`

#### `apps/web/src/services/sessions/types.ts` (NEW)
- `CatalogueSession` — matches `PublicSession` from shared
- `SessionDetail` — matches `PublicSessionDetail` from shared
- `CatalogueQuery` — page, limit, filter?

#### `apps/web/src/services/notifications/NotificationService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `getNotifications()` → GET `/v1/me/notifications`
  - `getPreferences()` → GET `/v1/me/notification-preferences`
  - `updatePreferences(prefs)` → PATCH `/v1/me/notification-preferences`

#### `apps/web/src/services/notifications/types.ts` (NEW)
- `NotificationEntry` — id, type, status, title, body, createdAt
- `NotificationPreferences` — email/sms/push prefs

#### `apps/web/src/services/admin/AdminService.ts` (NEW)
- Extends `BaseApiService`
- Methods (matching all existing admin API calls):
  - `getDashboard()` → GET `/v1/admin/dashboard`
  - `getSessions(params?)` → GET `/v1/admin/sessions?...`
  - `getSession(id)` → GET `/v1/admin/sessions/${id}`
  - `createSession(data)` → POST `/v1/admin/sessions`
  - `updateSession(id, data)` → PATCH `/v1/admin/sessions/${id}`
  - `publishSession(id)` → POST `/v1/admin/sessions/${id}/publish`
  - `openRegistration(id)` → POST `/v1/admin/sessions/${id}/open-registration`
  - `cancelSession(id, data)` → POST `/v1/admin/sessions/${id}/cancel`
  - `getLiveSessions()` → GET `/v1/admin/sessions?...` (LIVE|WAITING_START|ACTIVE)
  - `startLiveRound(sessionId, data)` → POST `/v1/admin/live/${sessionId}/rounds/start`
  - `pauseLive(sessionId, data?)` → POST `/v1/admin/live/${sessionId}/pause`
  - `resumeLive(sessionId)` → POST `/v1/admin/live/${sessionId}/resume`
  - `getMinigames()` → GET `/v1/admin/minigames`
  - `toggleMinigame(id, enabled)` → POST `/v1/admin/minigames/${id}/enable`
  - `getPayments(params?)` → GET `/v1/admin/payments?...`
  - `reconcilePayment(id, data)` → POST `/v1/admin/payments/${id}/reconcile`
  - `adjustWallet(userId, data)` → POST `/v1/admin/wallets/${userId}/adjust`
  - `getResults(sessionId)` → GET `/v1/admin/sessions/${id}/results`
  - `finalizeSession(sessionId, data)` → POST `/v1/admin/sessions/${id}/finalize`
  - `getComplianceGates()` → GET `/v1/admin/compliance/gates`
  - `updateComplianceGate(id, data)` → PATCH `/v1/admin/compliance/gates/${id}`
  - `getAuditLogs(params?)` → GET `/v1/admin/audit-logs?...`
  - `getUsers(params?)` → GET `/v1/admin/support/users?...`
  - `getUser(id)` → GET `/v1/admin/support/users/${id}`
  - `createSupportCase(userId, data)` → POST `/v1/admin/support/users/${id}/cases`
  - `createIncident(data)` → POST `/v1/admin/incidents`
  - `createAdminAction(data)` → POST `/v1/admin/actions`
  - `approveAdminAction(id, data)` → POST `/v1/admin/actions/${id}/approve`
  - `moderateAction(data)` → POST `/v1/admin/moderation/actions`
  - `shareSessionNotification(sessionId, data)` → POST `/v1/admin/notifications/session/${id}/share`

#### `apps/web/src/services/admin/types.ts` (NEW)
- Mirror all types from existing `admin-api.ts` and `admin-types.ts`
- `AdminUser`, `AdminRole`, `AdminDashboard`, `AdminSession`, `AdminSessionDetail`
- `PaymentTransaction`, `MiniGameDefinition`, `AuditEntry`, `SupportUser`, `SupportUserSummary`
- `Paginated<T>`, `ComplianceGate`, `ComplianceGateStatus`

#### `apps/web/src/services/payments/PaymentService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `initiateFapshiPayment(data)` → POST `/v1/payments/fapshi/initiate`
  - `getPaymentStatus(id)` → GET `/v1/payments/${id}/status`
  - `payWithWallet(registrationId, data)` → POST `/v1/registrations/${id}/pay-with-wallet`

#### `apps/web/src/services/payments/types.ts` (NEW)
- Payment-related types

#### `apps/web/src/services/wallet/WalletService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `getWallet()` → GET `/v1/wallet/me`
  - `getLedger(params?)` → GET `/v1/wallet/me/ledger`
  - `requestWithdrawal(data)` → POST `/v1/wallet/me/withdraw`

#### `apps/web/src/services/wallet/types.ts` (NEW)
- Wallet-related types

#### `apps/web/src/services/live/LiveService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `getLiveState(sessionId)` → GET `/v1/live/${sessionId}/state`
  - `createReservation(sessionId, data)` → POST `/v1/live/sessions/${id}/reservation`

#### `apps/web/src/services/live/types.ts` (NEW)
- Live-related types

#### `apps/web/src/services/players/PlayerService.ts` (NEW)
- Extends `BaseApiService`
- Methods:
  - `getProfile()` → GET `/v1/players/me`
  - `updateProfile(data)` → PATCH `/v1/players/me`
  - `getHistory(params?)` → GET `/v1/players/me/history`
  - `getStats()` → GET `/v1/players/me/stats`
  - `getResults(sessionId)` → GET `/v1/sessions/${id}/results`
  - `submitDispute(data)` → POST `/v1/support/disputes`

#### `apps/web/src/services/players/types.ts` (NEW)
- Player-related types

#### `apps/web/src/services/index.ts` (NEW)
- Re-export all services as named exports
- `export { AuthService, SessionService, NotificationService, AdminService, PaymentService, WalletService, LiveService, PlayerService }`

---

### Phase 2: Schemas

#### `apps/web/src/schemas/auth.ts` (NEW)
- Zod schemas matching API validation (register, login)
- `registerSchema` — email (lowercase), password (8-128), username (3-32), name?, phone?
- `loginSchema` — email, password
- Export inferred types

#### `apps/web/src/schemas/sessions.ts` (NEW)
- Zod schemas for catalogue responses

#### `apps/web/src/schemas/notifications.ts` (NEW)
- Zod schemas for notification responses

#### `apps/web/src/schemas/index.ts` (NEW)
- Re-export all schemas

---

### Phase 3: Store (zustand)

#### `apps/web/src/store/auth-store.ts` (NEW)
- Zustand store replacing module-level singleton in `useSession.ts`
- State:
  - `user: SessionUser | null`
  - `loading: boolean`
  - `initialized: boolean`
- Actions:
  - `setUser(user)`, `setLoading(loading)`
  - `initialize()` — fetch /me once
  - `login(input)` — call AuthService, update user on success
  - `register(input)` — call AuthService, update user on success
  - `logout()` — call AuthService, set user to null
  - `refresh()` — re-fetch /me

#### `apps/web/src/store/index.ts` (NEW)
- Re-export stores

---

### Phase 4: Actions (server actions)

#### `apps/web/src/actions/auth.ts` (NEW)
- `"use server"`
- Server actions that wrap AuthService:
  - `login(input: AuthInput)` → returns `ApiResponse`
  - `register(input: RegisterInput)` → returns `ApiResponse`
  - `logout()` → returns success
  - `getCurrentUser()` → returns `SessionUser | null`

#### `apps/web/src/actions/notifications.ts` (NEW)
- `"use server"`
- `getNotifications()` → returns notification list
- `getNotificationPreferences()` → returns preferences

#### `apps/web/src/actions/admin.ts` (NEW)
- `"use server"`
- `getDashboard()`, `getAdminSessions(params?)`, `getAdminSession(id)`, etc.
- One action per admin data-fetch operation

#### `apps/web/src/actions/index.ts` (NEW)
- Re-export all actions

---

### Phase 5: Types, Constants, Enums, Hooks

#### `apps/web/src/types/index.ts` (NEW)
- Re-export from `@session-jeu/shared`: `UserRole`, `SessionVisibility`, `PaginationParams`, `PaginatedResponse`
- Re-export from services: all domain-specific types

#### `apps/web/src/constants/api.ts` (NEW)
- `API_BASE` — `process.env.API_URL || "http://localhost:3001"`
- `API_REWRITE_BASE` — `"/api/v1"`
- Endpoint path constants (e.g., `AUTH_LOGIN = "/v1/auth/login"`)
- `PAGINATION` — default page/limit values

#### `apps/web/src/constants/index.ts` (NEW)
- Re-export all constants

#### `apps/web/src/enums/index.ts` (NEW)
- `UserRoleValues` — mirror the UserRole union as a JS object for runtime checks
- `SessionStatusValues` — runtime values for session statuses
- `NotificationTypeValues`

#### `apps/web/src/hooks/useAuth.ts` (NEW)
- Hook wrapping the zustand auth store
- Returns `{ user, loading, login, register, logout, refresh }`
- `useCurrentUser()` — shorthand selector for user
- `useAuthLoading()` — shorthand for loading state

#### `apps/web/src/hooks/index.ts` (NEW)
- Re-export all hooks

---

### Phase 6: Migration of existing inline patterns

#### `apps/web/src/app/admin/admin-api.ts` (MODIFY)
- Keep for backwards compatibility
- Re-implement `adminApiGet<T>` to use `AdminService` internally
- Re-implement `getCurrentAdmin()` to use `AdminService`
- This is a bridge so existing admin pages continue working

#### `apps/web/src/app/admin/layout.tsx` (MODIFY)
- Replace inline `getSession()` with call to `getCurrentUser()` from `actions/auth.ts`
- Import from `@/actions/auth`

#### `apps/web/src/app/(client)/notifications/page.tsx` (MODIFY)
- Replace inline `getNotifications()` with call from `actions/notifications.ts`
- Import from `@/actions/notifications`

---

## Testing Strategy

### New tests:

1. **`apps/web/src/services/api/__tests__/BaseApiService.test.ts`**
   - Test `buildUrl` with params
   - Test response parsing (success + error envelopes)
   - Test with mocked fetch

2. **`apps/web/src/services/auth/__tests__/AuthService.test.ts`**
   - Test `getCookieHeader` mock
   - Test `getMe` returns user

3. **`apps/web/src/schemas/__tests__/auth.test.ts`**
   - Test registerSchema validation (valid/invalid)
   - Test loginSchema validation (valid/invalid)

4. **`apps/web/src/store/__tests__/auth-store.test.ts`**
   - Test initial state
   - Test setUser action
   - Test login action (mocked)

5. **`apps/web/src/actions/__tests__/auth.test.ts`**
   - Test server action wraps AuthService correctly

### Updated tests:

6. **`apps/web/src/__tests__/pages.test.ts`**
   - Update forbidden word checks if needed

---

## Acceptance Criteria Mapping

- [x] AC1: `BaseApiService` abstract class created with cookie/header management → `services/api/BaseApiService.ts`
- [x] AC2: Domain-specific service classes created (Auth, Sessions, Notifications, Admin, Payments, Wallet, Live, Players) → `services/*/`
- [x] AC3: Server actions created that wrap services → `actions/*.ts`
- [x] AC4: Zustand auth store created → `store/auth-store.ts`
- [x] AC5: Zod schemas for API validation → `schemas/*.ts`
- [x] AC6: Types, constants, enums, hooks organized → `types/`, `constants/`, `enums/`, `hooks/`
- [x] AC7: Existing inline patterns migrated to use new services → `admin-api.ts`, `admin/layout.tsx`, `notifications/page.tsx`
- [x] AC8: Tests for services, schemas, store, actions pass

---

## Risks & Considerations

- **Zod v4 API**: `z.infer` still works (confirmed from API code). `.parse()` and `.safeParse()` are compatible. Will verify during execution.
- **Backwards compatibility**: `admin-api.ts` is kept with same API — all existing admin page imports continue working.
- **Server Actions location**: Next.js requires `"use server"` directives. All action files are marked.
- **zustand import**: Need to verify zustand v5+ API (may differ from v4). Check during execution.
- **No i18n/providers**: Skipped per user request.

---

## Execution Order

1. Install zustand
2. Create `services/api/BaseApiService.ts` + `errors.ts`
3. Create all domain services (auth, sessions, notifications, admin, payments, wallet, live, players)
4. Create `services/index.ts`
5. Create schemas (auth, sessions, notifications) + `index.ts`
6. Create store (auth-store + index)
7. Create actions (auth, notifications, admin + index)
8. Create types/index.ts
9. Create constants (api + index)
10. Create enums/index.ts
11. Create hooks (useAuth + index)
12. Migrate admin-api.ts, admin/layout.tsx, notifications/page.tsx
13. Create tests
14. Verify: typecheck, lint, test, build

---

## Step Complete
**Status:** ✓ Complete
**Files planned:** ~40 new files + 3 modified
**Tests planned:** 5 new test files
**Next:** step-03-execute.md
