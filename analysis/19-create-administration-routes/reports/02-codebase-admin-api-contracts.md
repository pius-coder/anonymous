# Codebase Admin API Contracts — Fact Report

**Agent:** explore-codebase  
**Date:** 2026-07-09  
**Source files examined:** All files under `apps/api/src/routes/admin/`, `apps/api/src/admin/`, `apps/api/src/auth/`, `apps/api/src/lib/responses.ts`, `apps/api/src/index.ts`, and 11 test files.

---

## 1. Route Registration (index.ts)

All admin routes mount under `/v1/admin`. Registration lines in `apps/api/src/index.ts`:

| Import variable | Route prefix | Line |
|---|---|---|
| `adminSessions` | `/v1/admin/sessions` | 60 |
| `adminPayments` | `/v1/admin/payments` | 63 |
| `adminWallets` | `/v1/admin/wallets` | 65 |
| `adminLobby` | `/v1/admin` | 67 |
| `adminLive` | `/v1/admin` | 69 |
| `adminMinigames` | `/v1/admin/minigames` | 71 |
| `adminResults` | `/v1/admin` | 73 |
| `adminOperations` | `/v1/admin` | 76 |
| `adminNotifications` | `/v1/admin` | 77 |
| `adminSecurity` | `/v1/admin` | 78 |

---

## 2. Route Files, Paths, Methods, and Line Numbers

### `apps/api/src/routes/admin/sessions.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| POST | `/` | 176 | ADMIN, SUPER_ADMIN | Create DRAFT session + audit log |
| GET | `/` | 236 | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | List sessions (paginated, filtered by status) |
| GET | `/:id` | 283 | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | Get session detail (registrations, rounds, live state, results, commission, dispute) |
| GET | `/:id/simulation` | 378 | ADMIN, SUPER_ADMIN | Financial simulation for session |
| PATCH | `/:id` | 410 | ADMIN, SUPER_ADMIN | Update session config (OCC + audit) |
| POST | `/:id/publish` | 550 | ADMIN, SUPER_ADMIN | Publish session + compliance gate check |
| POST | `/:id/open-registration` | 619 | ADMIN, SUPER_ADMIN | Open registration (DRAFT→PUBLISHED→ACTIVE) |
| POST | `/:id/cancel` | 674 | ADMIN, SUPER_ADMIN | Cancel session |

### `apps/api/src/routes/admin/payments.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| GET | `/` | 35 | FINANCE, SUPER_ADMIN, ADMIN, SUPPORT | List payments (paginated, filtered by status/session/user) |
| POST | `/:id/reconcile` | 89 | FINANCE, SUPER_ADMIN | Queue manual payment reconciliation + audit |

### `apps/api/src/routes/admin/wallets.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| POST | `/:userId/adjust` | 22 | FINANCE, SUPER_ADMIN | Adjust wallet (credit/debit, idempotent) |

### `apps/api/src/routes/admin/lobby.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| POST | `/sessions/:id/start` | 16 | ADMIN, SUPER_ADMIN | Authorize session start (min player check) |

### `apps/api/src/routes/admin/live.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| POST | `/live/:sessionId/pause` | 22 | ADMIN, SUPER_ADMIN | Pause live session |
| POST | `/live/:sessionId/resume` | 51 | ADMIN, SUPER_ADMIN | Resume paused live session |

### `apps/api/src/routes/admin/minigames.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| GET | `/` | 33-59 | ADMIN, SUPER_ADMIN | List mini-game definitions |
| POST | `/:id/enable` | 61 | ADMIN, SUPER_ADMIN | Enable/disable mini-game |
| POST | `/validate-config` | 83 | ADMIN, SUPER_ADMIN | Validate mini-game config + risk compliance |

### `apps/api/src/routes/admin/results.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| GET | `/sessions/:id/results` | 28 | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Get session results for admin |
| POST | `/sessions/:id/finalize` | 51 | ADMIN, SUPER_ADMIN | Finalize results + schedule credit distribution |
| POST | `/sessions/:id/correction-request` | 102 | ADMIN, SUPER_ADMIN, SUPPORT | Request results correction |

### `apps/api/src/routes/admin/operations.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| GET | `/dashboard` | 35 | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Dashboard KPIs (role-scoped) |
| GET | `/audit-logs` | 46 | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | List audit logs (cursor paginated, role-filtered) |
| GET | `/support/users/:id` | 68 | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Support user view (profile, wallet, payments, cases, registrations) |
| POST | `/support/users/:id/cases` | 86 | ADMIN, SUPER_ADMIN, SUPPORT | Create support case |
| POST | `/incidents` | 111 | ADMIN, SUPER_ADMIN, SUPPORT | Create incident |
| POST | `/actions` | 129 | ADMIN, SUPER_ADMIN | Request admin action (dual-control) |
| POST | `/actions/:id/approve` | 147 | SUPER_ADMIN | Approve admin action |

### `apps/api/src/routes/admin/notifications.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| POST | `/notifications/session/:id/share` | 18 | ADMIN, SUPER_ADMIN, SUPPORT | Create share message for session |

### `apps/api/src/routes/admin/security.ts`
| Method | Path | Line | Role guard | Description |
|---|---|---|---|---|
| GET | `/compliance/gates` | 20 | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | List compliance gates |
| POST | `/moderation/actions` | 30 | ADMIN, SUPER_ADMIN, SUPPORT | Create moderation action |

---

## 3. Response JSON Shapes

All endpoints use the standard envelope from `apps/api/src/lib/responses.ts:25`:

```ts
// success
{ success: true, data: T }

// error
{ success: false, error: { code: string, message: string, details?: Record<string, unknown> } }
```

### Individual `data` shapes per endpoint:

**POST /v1/admin/sessions** → `{ session: SerializedSession }`
**GET /v1/admin/sessions** → `{ data: SerializedSession[], meta: { total, page, limit, totalPages } }`
**GET /v1/admin/sessions/:id** → `{ session: SerializedSession & { registrations, rounds, liveState, results, commissionRecord, disputeWindow } }`
**GET /v1/admin/sessions/:id/simulation** → `{ simulation: FinancialSimulationResult }`
**PATCH /v1/admin/sessions/:id** → `{ session: SerializedSession }`
**POST /v1/admin/sessions/:id/publish** → `{ session: SerializedSession }`
**POST /v1/admin/sessions/:id/open-registration** → `{ session: SerializedSession }`
**POST /v1/admin/sessions/:id/cancel** → `{ session: SerializedSession }`

**GET /v1/admin/payments** → `{ data: PaymentWithRelations[], meta: { total, page, limit, totalPages } }`
**POST /v1/admin/payments/:id/reconcile** → `{ queued: true, paymentId: string }`

**POST /v1/admin/wallets/:userId/adjust** → `{ wallet: SerializedWallet, ledgerEntry: SerializedLedgerEntry }`

**POST /v1/admin/sessions/:id/start** → `{ session, checkedInCount }`

**POST /v1/admin/live/:sessionId/pause** → `{ liveState }`
**POST /v1/admin/live/:sessionId/resume** → `{ liveState }`

**GET /v1/admin/minigames** → `{ definitions: MiniGameDefinition[] }`
**POST /v1/admin/minigames/:id/enable** → `{ definition: MiniGameDefinition }`
**POST /v1/admin/minigames/validate-config** → `{ config: ValidatedConfig }`

**GET /v1/admin/sessions/:id/results** → `{ session, results, distributions, commission, disputeWindow }`
**POST /v1/admin/sessions/:id/finalize** → `{ status, sessionId, commissionId, winnerCount }` (201) or `{ status: "already-finalized", commissionId }` (200)
**POST /v1/admin/sessions/:id/correction-request** → `{ disputeWindow: { id, status, reason, requestedById, requestedAt } }`

**GET /v1/admin/dashboard** → `{ dashboard: { role, scope, sessions, registrations, incidents, support, finance? } }`
**GET /v1/admin/audit-logs** → `{ entries: AuditLogEntry[], nextCursor: string | null }`
**GET /v1/admin/support/users/:id** → `{ user: SupportUserView }`
**POST /v1/admin/support/users/:id/cases** → `{ supportCase }` (201)
**POST /v1/admin/incidents** → `{ incident }` (201)
**POST /v1/admin/actions** → `{ action }` (201)
**POST /v1/admin/actions/:id/approve** → `{ action }`

**POST /v1/admin/notifications/session/:id/share** → `{ message, shareUrl, shareLink: { id, token, sessionId } }` (201)

**GET /v1/admin/compliance/gates** → `{ gates: ComplianceGate[] }`
**POST /v1/admin/moderation/actions** → `{ action }` (201)

---

## 4. Auth and Role Checks

### Middleware architecture (`apps/api/src/auth/session.ts`)

- **`requireAuth`** (line 120): Reads `__Host-session` cookie, validates SHA-256 hash against DB `authSession` table, checks `revokedAt`, `expiresAt`, `isActive`, `sessionVersion`, and injects `{ id, email, name, role, sessionId }` on `c.get("user")`.
- **`requireRole(...roles)`** (line 171): Factory that returns middleware checking `user.role` against allowed roles. Returns 403 `ROLE_REQUIRED` if insufficient.

### Role model (5 values, line 7):
`"PLAYER" | "SUPPORT" | "FINANCE" | "ADMIN" | "SUPER_ADMIN"`

### Role matrix per endpoint group:

| Module | Allowed roles |
|---|---|
| Sessions (write): create, update, publish, open-registration, cancel, simulation | ADMIN, SUPER_ADMIN |
| Sessions (read): list, detail | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT |
| Payments (list) | FINANCE, SUPER_ADMIN, ADMIN, SUPPORT |
| Payments (reconcile) | FINANCE, SUPER_ADMIN |
| Wallets (adjust) | FINANCE, SUPER_ADMIN |
| Lobby (start session) | ADMIN, SUPER_ADMIN |
| Live (pause/resume) | ADMIN, SUPER_ADMIN |
| Mini-games | ADMIN, SUPER_ADMIN |
| Results (view, finalize) | ADMIN, SUPER_ADMIN |
| Results (correction request) | ADMIN, SUPER_ADMIN, SUPPORT |
| Dashboard | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE |
| Audit logs | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE |
| Support user view | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE |
| Support cases | ADMIN, SUPER_ADMIN, SUPPORT |
| Incidents | ADMIN, SUPER_ADMIN, SUPPORT |
| Admin actions (request) | ADMIN, SUPER_ADMIN |
| Admin actions (approve) | SUPER_ADMIN only |
| Notifications (share) | ADMIN, SUPER_ADMIN, SUPPORT |
| Compliance gates | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE |
| Moderation actions | ADMIN, SUPER_ADMIN, SUPPORT |

### Audit behavior

Every mutating endpoint writes to `auditLog` table via `prisma.auditLog.create` within a transaction. Context captured includes:
- `userId` (the admin), `action` (string like `"session.published"`), `entity` (model name), `entityId`
- `reason` (mandatory human-readable explanation)
- `oldData` / `newData` (JSON snapshots for before/after)
- `requestId`, `ipAddress`, `userAgent` from `auditContext(c)` helper

### Dual-control flow
- Admin actions (`POST /actions`) create `AdminActionApproval` with status `REQUESTED`.
- Only `SUPER_ADMIN` can approve (`POST /actions/:id/approve`) and cannot approve own requests.
- Endpoints using `auditContext()` add `requestId`, `ipAddress`, `userAgent`.

### Config version (OCC)
Session mutations use `expectedConfigVersion` + `configVersion: { increment: 1 }` with `updateMany` row-count check for optimistic concurrency control. Returns 409 `CONFIG_VERSION_CONFLICT` on mismatch.

---

## 5. Existing Admin Tests and Coverage

### `apps/api/src/admin/__tests__/sessionConfig.test.ts` (unit)
- Financial simulation calculation with integer XAF arithmetic
- Zod schema validation: capacity, winner split, past start time, registration close
- Required reason + expectedConfigVersion for updates
- Session code generation (slugify, uppercase, URL-safe)

### `apps/api/src/routes/__tests__/admin-sessions.test.ts` (integration, 12 tests)
- Create DRAFT session + audit log write
- Refuse player access
- Financial simulation with paid registrations count
- Update session config with OCC + audit
- Config version conflict → 409
- Sensitive field lock when paid registrations exist → 409
- Publish valid session with audit
- Compliance gate blocks → 403
- Refuse publish on invalid session (null startTime)
- Open registration → status transition PUBLISHED→ACTIVE
- Cancel session + audit + data assertions

### `apps/api/src/routes/__tests__/admin-payments.test.ts` (integration, 4 tests)
- Finance role queues manual reconciliation
- Reason required → 400
- Unknown payment → 404
- Non-finance admin → 403

### `apps/api/src/routes/__tests__/admin-wallets.test.ts` (integration, 3 tests)
- Finance adjusts wallet with reason → 201
- Missing reason → 400
- Non-finance admin → 403

### `apps/api/src/routes/__tests__/admin-lobby.test.ts` (integration, 3 tests)
- Admin starts session with min players reached → 200
- Min players not reached → 409
- Non-admin → 403

### `apps/api/src/routes/__tests__/admin-live.test.ts` (integration, 3 tests)
- Pause live session with reason → 200
- Resume paused session → 200
- Non-admin → 403

### `apps/api/src/routes/__tests__/admin-minigames.test.ts` (integration, 5 tests)
- List definitions → 200
- Non-admin → 403
- Enable/disable definition → 200
- Validate config → 200 / 400
- Block chance-dominant risk → 422

### `apps/api/src/routes/__tests__/admin-results.test.ts` (integration, 4 tests)
- Finalize session + credit distribution scheduled
- Tie policy required → 422
- Non-admin finalize → 403
- Correction request with reason → 200

### `apps/api/src/routes/__tests__/admin-operations.test.ts` (integration, 10 tests)
- Dashboard KPIs for admin
- Support dashboard hides finance scope
- Player dashboard → 403
- Audit log filtering + data hiding for support
- Support user view hides provider secrets
- Incident creation requires reason → 400
- Incident creation with audit context
- Self-approval refused → 409
- Audit log deletion route → 404

### `apps/api/src/routes/__tests__/admin-notifications.test.ts` (integration, 3 tests)
- Create share message → 201, no PII leak
- Private session → 403
- Player access → 403

### `apps/api/src/routes/__tests__/admin-security.test.ts` (integration, 3 tests)
- List compliance gates → 200
- Create moderation action with reason → 201
- Player moderation → 403

**Total: ~53 tests across all admin modules.**

---

## 6. API Contracts Consumable by Missing Web Admin Pages

The following admin UI pages could be built from existing API contracts. Each entry is a realistic page/router path with the endpoints it would consume.

| Proposed admin page | Endpoints consumed | Notes |
|---|---|---|
| `/admin/sessions` | `GET /v1/admin/sessions` (list), `POST /v1/admin/sessions` (create) | Paginated, status-filtered list; create DRAFT form |
| `/admin/sessions/:id` | `GET /v1/admin/sessions/:id` (detail), `PATCH /v1/admin/sessions/:id` (edit), `POST /v1/admin/sessions/:id/publish`, `POST /v1/admin/sessions/:id/open-registration`, `POST /v1/admin/sessions/:id/cancel` | Full session lifecycle UI |
| `/admin/sessions/:id/simulation` | `GET /v1/admin/sessions/:id/simulation` | Financial simulation display |
| `/admin/payments` | `GET /v1/admin/payments` (list), `POST /v1/admin/payments/:id/reconcile` | Payment review, manual reconcile |
| `/admin/users/:id` | `GET /v1/admin/support/users/:id` | Support user view (profile, wallet, registrations, payments) |
| `/admin/users/:id/cases` | `POST /v1/admin/support/users/:id/cases` | Create support case from user view |
| `/admin/wallets/:userId/adjust` | `POST /v1/admin/wallets/:userId/adjust` | Manual wallet adjustment |
| `/admin/results/:sessionId` | `GET /v1/admin/sessions/:id/results`, `POST /v1/admin/sessions/:id/finalize`, `POST /v1/admin/sessions/:id/correction-request` | Results management |
| `/admin/live/:sessionId` | `POST /v1/admin/live/:sessionId/pause`, `POST /v1/admin/live/:sessionId/resume` | Live session controls |
| `/admin/lobby/:sessionId` | `POST /v1/admin/sessions/:id/start` | Start session from lobby |
| `/admin/minigames` | `GET /v1/admin/minigames`, `POST /v1/admin/minigames/:id/enable`, `POST /v1/admin/minigames/validate-config` | Mini-game catalogue management |
| `/admin/dashboard` | `GET /v1/admin/dashboard` | KPI dashboard |
| `/admin/audit-logs` | `GET /v1/admin/audit-logs` | Audit trail with cursor pagination and filters |
| `/admin/incidents` | `POST /v1/admin/incidents` | Create incident |
| `/admin/actions` | `POST /v1/admin/actions` (request), `POST /v1/admin/actions/:id/approve` (approve) | Dual-control action management |
| `/admin/notifications/sessions/:id/share` | `POST /v1/admin/notifications/session/:id/share` | Generate share link/message |
| `/admin/compliance/gates` | `GET /v1/admin/compliance/gates` | Compliance gate status |
| `/admin/moderation` | `POST /v1/admin/moderation/actions` | Moderation actions |

**Missing API contracts** (not yet implemented as admin endpoints):
- User search/filter list endpoint (only detail via `/support/users/:id`)
- Role management (no admin endpoint to change user roles)
- Session player list / kick or ban player
- Bulk operations (bulk cancel sessions, bulk reconcile payments)
- System settings / feature flags management
- Webhook logs viewer
- Session round editor (re-ordering, modifying mini-games within a session)
- Player session history (only per-user view via support view)

---

## Files Read

- `apps/api/src/index.ts` (90 lines)
- `apps/api/src/lib/responses.ts` (33 lines)
- `apps/api/src/auth/session.ts` (181 lines)
- `apps/api/src/auth/password.ts` (40 lines)
- `apps/api/src/auth/rateLimit.ts` (32 lines)
- `apps/api/src/auth/validation.ts` (45 lines)
- `apps/api/src/routes/admin/sessions.ts` (735 lines)
- `apps/api/src/routes/admin/payments.ts` (126 lines)
- `apps/api/src/routes/admin/wallets.ts` (69 lines)
- `apps/api/src/routes/admin/lobby.ts` (55 lines)
- `apps/api/src/routes/admin/live.ts` (71 lines)
- `apps/api/src/routes/admin/minigames.ts` (120 lines)
- `apps/api/src/routes/admin/results.ts` (137 lines)
- `apps/api/src/routes/admin/operations.ts` (175 lines)
- `apps/api/src/routes/admin/notifications.ts` (51 lines)
- `apps/api/src/routes/admin/security.ts` (47 lines)
- `apps/api/src/admin/operations.ts` (539 lines)
- `apps/api/src/admin/sessionConfig.ts` (223 lines)
- `apps/api/src/admin/__tests__/sessionConfig.test.ts` (68 lines)
- `apps/api/src/routes/__tests__/admin-sessions.test.ts` (465 lines)
- `apps/api/src/routes/__tests__/admin-payments.test.ts` (145 lines)
- `apps/api/src/routes/__tests__/admin-wallets.test.ts` (191 lines)
- `apps/api/src/routes/__tests__/admin-lobby.test.ts` (126 lines)
- `apps/api/src/routes/__tests__/admin-live.test.ts` (146 lines)
- `apps/api/src/routes/__tests__/admin-minigames.test.ts` (191 lines)
- `apps/api/src/routes/__tests__/admin-results.test.ts` (220 lines)
- `apps/api/src/routes/__tests__/admin-operations.test.ts` (398 lines)
- `apps/api/src/routes/__tests__/admin-notifications.test.ts` (106 lines)
- `apps/api/src/routes/__tests__/admin-security.test.ts` (120 lines)