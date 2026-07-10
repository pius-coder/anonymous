# Agent 06: Codebase Payments, Wallets, Users & Audit Report

## 1. Admin Support Endpoints & Response Shapes

### Payments (`apps/api/src/routes/admin/payments.ts` → `/v1/admin/payments`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/` | FINANCE, SUPER_ADMIN, ADMIN, SUPPORT | List payment transactions with pagination + filters |
| POST | `/:id/reconcile` | FINANCE, SUPER_ADMIN | Queue reconciliation for a specific payment |

**GET `/` query params**: `page`, `limit` (1-100), `status` (PENDING/SUCCESSFUL/FAILED/EXPIRED/REFUNDED), `sessionId`, `userId`

**GET `/` response shape**:
```json
{
  "success": true,
  "data": {
    "data": [{
      "id": "string",
      "session": { "id", "code", "name" } | null,
      "user": { "id", "email", "name" },
      "amountXaf": "number",
      "currency": "string",
      "status": "string",
      "provider": "string",
      "providerTransId": "string | null",
      "providerExternalId": "string | null",
      "registrationStatus": "string | null",
      "createdAt": "ISO string",
      "updatedAt": "ISO string"
    }],
    "meta": { "total", "page", "limit", "totalPages" }
  }
}
```

**POST `/:id/reconcile` body**: `{ reason: string (3-500 chars) }`

**POST `/:id/reconcile` response**: `{ success: true, data: { queued: true, paymentId: "string" } }`

Error codes: `PAYMENT_NOT_FOUND` (404), `VALIDATION_ERROR` (400).

---

### Wallets (`apps/api/src/routes/admin/wallets.ts` → `/v1/admin/wallets`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/:userId/adjust` | FINANCE, SUPER_ADMIN | Credit/debit a user's wallet |

**POST `/:userId/adjust` body**:
```json
{
  "amountXaf": "number (positive integer)",
  "direction": "CREDIT | DEBIT",
  "reason": "string (3-500 chars)",
  "idempotencyKey": "string (8-200 chars)",
  "type": "BONUS | REFUND | ADJUSTMENT (default ADJUSTMENT)",
  "referenceType": "string (optional, 1-100 chars)",
  "referenceId": "string (optional, 1-200 chars)"
}
```

**Response**: `{ wallet: WalletShape, ledgerEntry: LedgerEntryShape }` with 201 (new) or 200 (idempotent).

Error codes: `USER_NOT_FOUND` (404), `WALLET_FROZEN` (409), `INSUFFICIENT_FUNDS` (409), `LEDGER_DUPLICATE` (409), `VALIDATION_ERROR` (400).

---

### Security (`apps/api/src/routes/admin/security.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/compliance/gates` | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | List compliance gates (with upsert of defaults) |
| POST | `/moderation/actions` | ADMIN, SUPER_ADMIN, SUPPORT | Apply moderation action |

**GET `/compliance/gates` response**: `{ success: true, data: { gates: [{ id, type, scope, status, reason, decidedAt }] } }`

**POST `/moderation/actions` body**:
```json
{
  "type": "WARN_USER | FREEZE_WALLET | SUSPEND_USER | RESTRICT_SESSION | NOTE",
  "targetUserId": "string (optional)",
  "sessionId": "string (optional)",
  "reason": "string (3-500 chars)",
  "payload": "object (optional)"
}
```

**POST `/moderation/actions` response**: `{ success: true, data: { action: ModerationActionRecord }, ... }` with 201.

Error codes: Side effects: `FREEZE_WALLET` → `wallet.updateMany({ isFrozen: true })`, `SUSPEND_USER` → `user.update({ isActive: false, sessionVersion: increment })`. All actions create an audit log entry.

---

### Operations (`apps/api/src/routes/admin/operations.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/dashboard` | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Aggregated KPI dashboard |
| GET | `/audit-logs` | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Cursor-paginated audit logs with filters |
| GET | `/support/users/:id` | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Full user profile for support view |
| POST | `/support/users/:id/cases` | ADMIN, SUPER_ADMIN, SUPPORT | Create support case for user |
| POST | `/incidents` | ADMIN, SUPER_ADMIN, SUPPORT | Create an incident log |
| POST | `/actions` | ADMIN, SUPER_ADMIN | Request a privileged admin action |
| POST | `/actions/:id/approve` | SUPER_ADMIN | Approve a pending admin action |

**GET `/dashboard` response**: Role-scoped. Includes sessions, registrations, incidents, support open cases, pending actions. Finance section only if `canViewFinance` (FINANCE, ADMIN, SUPER_ADMIN).

**GET `/audit-logs` query params**: `actorId`, `action`, `entity`, `entityId`, `requestId`, `cursor`, `limit` (1-100). FINANCE role can only see `payment*`/`wallet*` related actions. ADMIN/SUPER_ADMIN see `oldData`/`newData`; others get `null`.

**GET `/support/users/:id` response**: Full user profile including email, phone, name, role, isActive, profile (username, avatarUrl, isPublic, level, xp), wallet (balanceXaf, isFrozen, recent ledgers), registrations (last 10), payments (last 10), support cases (last 10). Ledger visible only if `canViewLedger`.

**POST `/support/users/:id/cases` body**: `{ subject, description?, reason }`
**POST `/incidents` body**: `{ sessionId?, severity, category, title, description?, reason }`
**POST `/actions` body**: `{ action, entity, entityId?, reason, payload?, beforeData?, afterData? }`
**POST `/actions/:id/approve` body**: `{ reason }`

Error codes: `USER_NOT_FOUND` (404), `ACTION_NOT_FOUND` (404), `409_ACTION_NOT_APPROVABLE` (409).

---

### Notifications (`apps/api/src/routes/admin/notifications.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/notifications/session/:id/share` | ADMIN, SUPER_ADMIN, SUPPORT | Generate share message for a session |

Response: `{ message, shareUrl, shareLink: { id, token, sessionId } }` with 201.

Error codes: `SESSION_NOT_FOUND` (404), `SESSION_PRIVATE` (403).

---

### Sessions (`apps/api/src/routes/admin/sessions.ts` → `/v1/admin/sessions`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/` | ADMIN, SUPER_ADMIN | Create a draft session |
| GET | `/` | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | List sessions with pagination + status filter |
| GET | `/:id` | ADMIN, SUPER_ADMIN, FINANCE, SUPPORT | Full session detail with registrations, rounds, liveState, results, commission, disputeWindow |
| PATCH | `/:id` | ADMIN, SUPER_ADMIN | Update session config (optimistic lock via configVersion) |
| GET | `/:id/simulation` | ADMIN, SUPER_ADMIN | Financial simulation for a session |
| POST | `/:id/publish` | ADMIN, SUPER_ADMIN | Publish a draft session (checks compliance gates) |
| POST | `/:id/open-registration` | ADMIN, SUPER_ADMIN | Open registration for a published session |
| POST | `/:id/cancel` | ADMIN, SUPER_ADMIN | Cancel a session (unless completed) |

---

### Live (`apps/api/src/routes/admin/live.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/live/:sessionId/pause` | ADMIN, SUPER_ADMIN | Pause a live session |
| POST | `/live/:sessionId/resume` | ADMIN, SUPER_ADMIN | Resume a paused live session |

---

### Lobby (`apps/api/src/routes/admin/lobby.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| POST | `/sessions/:id/start` | ADMIN, SUPER_ADMIN | Authorize session start (checks min players) |

---

### Results (`apps/api/src/routes/admin/results.ts` → `/v1/admin`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/sessions/:id/results` | ADMIN, SUPER_ADMIN, SUPPORT, FINANCE | Full results view |
| POST | `/sessions/:id/finalize` | ADMIN, SUPER_ADMIN | Finalize session results + trigger prize distribution |
| POST | `/sessions/:id/correction-request` | ADMIN, SUPER_ADMIN, SUPPORT | Request a results correction/dispute |

---

### Minigames (`apps/api/src/routes/admin/minigames.ts` → `/v1/admin/minigames`)

| Method | Path | RBAC | Description |
|--------|------|------|-------------|
| GET | `/` (or ``) | ADMIN, SUPER_ADMIN | List mini-game definitions with full metadata |
| POST | `/:id/enable` | ADMIN, SUPER_ADMIN | Enable/disable a mini-game |
| POST | `/validate-config` | ADMIN, SUPER_ADMIN | Validate a mini-game config against its schema |

---

## 2. Wallet/Payment/User/Audit Data Structures

### Wallet & Ledger (`apps/api/src/wallet/wallet.ts`)

**Wallet record**: `id, userId, balanceXaf, currency, isFrozen, version, createdAt, updatedAt`

**LedgerEntry record**: `id, walletId, userId, amountXaf, balanceAfterXaf, direction (CREDIT/DEBIT), type (ENTRY_FEE/PRIZE/REFUND/BONUS/ADJUSTMENT), description, referenceType, referenceId, idempotencyKey, paymentId, sessionId, createdAt`

**Ledger types**: `ENTRY_FEE`, `PRIZE`, `REFUND`, `BONUS`, `ADJUSTMENT`
**Ledger directions**: `CREDIT`, `DEBIT`
**Idempotency**: Enforced via unique `idempotencyKey` on `LedgerEntry`. Transactions use serializable isolation with retry.

**Wallet adjustment** (`adjustWallet`): Only allows `BONUS | REFUND | ADJUSTMENT` types. Blocks: user-not-found, wallet-frozen, insufficient-funds, ledger-duplicate. Always creates audit log with adminUserId as actor.

### Payment Transaction (`apps/api/src/payments/fapshi.ts`)

**Fields**: `id, userId, sessionId, registrationId, amount, amountXaf, currency, status (PENDING/SUCCESSFUL/FAILED/EXPIRED/REFUNDED), provider (FAPSHI), providerExternalId, providerTransId, providerStatus, checkoutUrl, webhookReceivedAt, metadata, createdAt, updatedAt`

**Provider**: Fapshi only. Sandbox at `sandbox.fapshi.com`, live at `live.fapshi.com`. Credentials from env `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_BASE_URL`.

**Webhook flow**: Deduplicates via `webhookEvent` table (`eventKey = "FAPSHI:<transId>:<status>"`). Processes payment status updates in serializable transactions. On SUCCESSFUL: marks registration PAID, queues notification + check-in reminder.

### Player Profile (`apps/api/src/players/playerProfile.ts`)

**Private profile**: `id, userId, username, bio, avatarUrl, preferences, isPublic, level, xp, stats ({ sessionsPlayed, sessionsWon, winRate, avgFinalRank, creditsWonXaf, computedAt }), createdAt, updatedAt`

**Public profile**: `username, bio, avatarUrl, level, stats`

**Stats snapshot**: Computed from GameResult and LedgerEntry (PRIZE credits). Recomputable. Upserted.

**History**: Cursor-paginated session registrations with game results, categorized into buckets: `no-show`, `cancelled`, `completed`, `live`, `future`.

### Audit Log (`apps/api/src/admin/operations.ts`)

**Fields**: `id, userId (actor), action, entity, entityId, reason, requestId, ipAddress, userAgent, oldData, newData, createdAt`

**Actions observed**: `payment.*`, `wallet.*`, `session.*`, `support.*`, `incident.*`, `admin.*`, `moderation.*`, `stats.*`, `profile.*`, `dispute.*`

**Role-based filtering**: FINANCE role can only see `payment*`/`wallet*` actions and `PaymentTransaction`/`Wallet`/`LedgerEntry`/`PrizeDistribution` entities. ADMIN/SUPER_ADMIN see `oldData`/`newData` payloads; other roles get `null`.

### Compliance Gates (`apps/api/src/security/security.ts`)

**Types**: `WITHDRAWAL` (global, real-money withdrawals disabled V1), `MINI_GAME_RISK` (chance-dominant), `LEGAL_WORDING` (public-session), `PUBLIC_LAUNCH` (global)

**Statuses**: `BLOCKED` (only status used currently). Auto-upserted on first check.

### Moderation Actions (`apps/api/src/security/security.ts`)

**Types**: `WARN_USER`, `FREEZE_WALLET`, `SUSPEND_USER`, `RESTRICT_SESSION`, `NOTE`

**Side effects**: `FREEZE_WALLET` → sets `wallet.isFrozen = true`. `SUSPEND_USER` → sets `user.isActive = false` + increments `sessionVersion`.

### Risk & Anti-Cheat (`apps/api/src/security/security.ts`)

**RiskSignal**: `type (ANTICHEAT/AUTHORIZATION_DENIED/WEBHOOK_SIGNATURE_FAILURE/MULTI_ACCOUNT/DEVICE_HASH/PAYMENT_PATTERN/COMPLIANCE), severity (LOW/MEDIUM/HIGH/CRITICAL), source, deviceHash (SHA256, truncated in output), ipHash (SHA256, truncated in output), reason, metadata`

**AntiCheatEvent**: `type (DOUBLE_SUBMIT/AUTO_CLICK/LATE_INPUT/LATENCY_ABUSE/MANUAL_REVIEW), severity, sessionId, roundId, playerActionId, userId, actionNonce, latencyMs, metadata`

**Session risk endpoint** (player-facing, not admin): Returns aggregated risk score, signals, and anti-cheat events with redacted hashes.

### Support Case + Incident + Admin Action Approval

**SupportCase**: `id, userId, createdById, subject, description, status (OPEN/IN_PROGRESS/CLOSED), createdAt, closedAt`

**IncidentLog**: `id, createdById, sessionId, severity (LOW/MEDIUM/HIGH/CRITICAL), category, title, description, resolvedAt`

**AdminActionApproval**: `id, action, entity, entityId, reason, requestedById, approvedById, status (REQUESTED/APPROVED/REJECTED), payload, beforeData, afterData, decidedAt`

### User model (via support view and schema)

Fields exposed: `id, email, phone, name, role, isActive, createdAt`. Related: `profile`, `wallet`, `registrations`, `payments`, `supportCasesForUser`.

---

## 3. Existing Tests & Edge Cases

### Admin route tests (in `apps/api/src/routes/__tests__/`)

| Test file | Lines | Coverage highlights |
|-----------|-------|---------------------|
| `admin-payments.test.ts` | 145 | List payments (role gating), reconcile payment (role gating, not-found), PLAYER forbidden |
| `admin-wallets.test.ts` | 191 | Successful adjustment, frozen wallet, insufficient funds, ledger duplicate, PLAYER forbidden, FINANCE allowed |
| `admin-security.test.ts` | 120 | List compliance gates, create moderation action, PLAYER access denied |
| `admin-operations.test.ts` | 398 | Dashboard KPI, audit logs (with FINANCE filter), support user view (not-found), create support case, create incident, create admin action, approve action, PLAYER forbidden |
| `admin-sessions.test.ts` | 465 | Create draft, list pagination, get by id, update config, publish (compliance check), open registration, cancel, PLAYER forbidden, FINANCE/SUPPORT read-only |
| `admin-live.test.ts` | ~100 | Pause/resume live session, PLAYER forbidden, not-live error |
| `admin-lobby.test.ts` | ~100 | Authorize session start, min-not-reached error |
| `admin-results.test.ts` | ~150 | Get results, finalize results, correction request, idempotent finalization |
| `admin-minigames.test.ts` | ~100 | List definitions, enable/disable, validate config, compliance-gated chance-dominant games |
| `admin-notifications.test.ts` | 106 | Create share message, private session refused, PLAYER access forbidden |

### Unit tests

| Test file | Coverage |
|-----------|----------|
| `apps/api/src/wallet/__tests__/wallet.test.ts` (246 lines) | `adjustWallet` happy path, frozen wallet, insufficient funds, ledger duplicate, user not found, idempotency; `payRegistrationWithWallet` happy path, expired, already-paid, not-payable, wallet-frozen, insufficient funds, forbidden; `computeLedgerBalanceXaf` |
| `apps/api/src/payments/__tests__/fapshi.test.ts` (163 lines) | `applyFapshiPaymentStatus` with SUCCESSFUL/FAILED/EXPIRED, unknown payment, replay dedup, registration paid flow; `mapFapshiStatus` mapping |
| `apps/api/src/security/__tests__/security.test.ts` (140 lines) | `assertMiniGameRiskAllowed` blocked/passed, `assertPublicSessionCompliance` blocked, `createAntiCheatSignal` dual-create, `getSessionRisk` hash redaction |
| `apps/api/src/admin/__tests__/sessionConfig.test.ts` (68 lines) | Financial calculations, schema validation (capacity, timing, winner split), code generation |

### Edge cases covered
- **Idempotency**: Wallet operations use `idempotencyKey` unique constraint; returns 200 on replay
- **Optimistic locking**: Session updates use `configVersion`; returns 409 on conflict
- **Serializable isolation**: Wallet/payment/registration operations wrapped in `$transaction` with `Serializable` isolation level
- **Role matrix**: `adminRoleMatrix()` in `operations.ts` defines per-role capabilities; used server-side for data filtering
- **FINANCE scope**: Audit log queries are scoped to payment/wallet actions; oldData/newData hidden from non-ADMIN/SUPER_ADMIN
- **Compliance gates**: Public session publication blocked if gates are not passed; chance-dominant mini-games blocked without legal review
- **Hash redaction**: `deviceHash` and `ipHash` truncated to first 8 chars in API output
- **Webhook replay**: `webhookEvent.eventKey` unique constraint prevents double-processing

### Missing test coverage
- No tests for player-facing wallet endpoints (`/v1/wallet/*`)
- No tests for player-facing payment initiation (`/v1/payments/*`)
- No E2E tests for full payment → wallet credit flow
- No concurrent wallet adjustment tests (2 admins adjusting same wallet simultaneously)
- No tests for bulk payment reconciliation
- No load tests for dashboard KPI aggregation

---

## 4. Missing Web Pages/Routes Suggested by API Availability

### Admin sidebar items (from `apps/web/src/app/admin/layout.tsx`):
```typescript
{ label: "Dashboard", href: "/admin", roles: [ADMIN, SUPER_ADMIN, FINANCE, SUPPORT] }
{ label: "Sessions", href: "/admin/sessions", roles: [ADMIN, SUPER_ADMIN], viewRoles: [FINANCE, SUPPORT] }
{ label: "Live control", href: "/admin/live", roles: [ADMIN, SUPER_ADMIN], viewRoles: [SUPPORT] }
{ label: "Paiements", href: "/admin/payments", roles: [ADMIN, SUPER_ADMIN, FINANCE], viewRoles: [SUPPORT] }
{ label: "Wallets", href: "/admin/wallets", roles: [SUPER_ADMIN, FINANCE], viewRoles: [SUPPORT] }
{ label: "Utilisateurs", href: "/admin/users", roles: [ADMIN, SUPER_ADMIN, SUPPORT], viewRoles: [FINANCE] }
{ label: "Mini-jeux", href: "/admin/minigames", roles: [ADMIN, SUPER_ADMIN] }
{ label: "Audit logs", href: "/admin/audit", roles: [ADMIN, SUPER_ADMIN, FINANCE, SUPPORT] }
```

### Existing web pages
| Route | Status | Notes |
|-------|--------|-------|
| `/admin` | ✅ Exists | Dashboard with KPI cards; role-gated data visibility |
| `/admin/sessions` | ✅ Exists | Listed in layout; page exists |
| `/admin/live` | ❌ Missing | No page file; sidebar item points here |
| `/admin/payments` | ❌ Missing | No page file; sidebar item points here |
| `/admin/wallets` | ❌ Missing | No page file; sidebar item points here |
| `/admin/users` | ❌ Missing | No page file (except `/admin/users/[id]` not found) |
| `/admin/minigames` | ❌ Missing | No page file |
| `/admin/audit` | ❌ Missing | No page file |

### Missing pages (API exists, no web UI):
1. **`/admin/live`** — POST `/v1/admin/live/:sessionId/pause`, POST `/v1/admin/live/:sessionId/resume`
2. **`/admin/payments`** — GET `/v1/admin/payments`, POST `/v1/admin/payments/:id/reconcile`
3. **`/admin/wallets`** — POST `/v1/admin/wallets/:userId/adjust`
4. **`/admin/users`** and **`/admin/users/[id]`** — GET `/v1/admin/support/users/:id`, POST `/v1/admin/support/users/:id/cases`
5. **`/admin/minigames`** — GET `/v1/admin/minigames`, POST `/v1/admin/minigames/:id/enable`, POST `/v1/admin/minigames/validate-config`
6. **`/admin/audit`** — GET `/v1/admin/audit-logs`
7. **`/admin/incidents`** — POST `/v1/admin/incidents` (no sidebar item, but API exists)
8. **`/admin/actions`** — POST `/v1/admin/actions`, POST `/v1/admin/actions/:id/approve` (no sidebar item)

### Missing internal/player routes suggested by API:
- No admin endpoint to list all users or search users by email/name/role — only `GET /support/users/:id` (by exact ID)
- No admin endpoint to list wallets or search wallets
- No admin endpoint to bulk-reconcile payments
- No admin endpoint for prize distribution history
- No admin endpoint for notification broadcast (admin broadcast to all/session players)
- No player-facing wallet history page (API exists at `GET /v1/wallet/ledger`)

---

## 5. Security/RBAC/Audit Behavior

### RBAC Role hierarchy
Roles used: `PLAYER` (default), `ADMIN`, `SUPER_ADMIN`, `FINANCE`, `SUPPORT`

### Role matrix (`adminRoleMatrix` in `operations.ts`)

| Capability | SUPER_ADMIN | ADMIN | FINANCE | SUPPORT |
|-----------|-------------|-------|---------|---------|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| View audit logs | ✅ (full data) | ✅ (full data) | ✅ (payment/wallet only) | ✅ (no old/new data) |
| View support users | ✅ | ✅ | ✅ | ✅ |
| Create support cases | ✅ | ✅ | ❌ | ✅ |
| Create incidents | ✅ | ✅ | ❌ | ✅ |
| Request admin actions | ✅ | ✅ | ❌ | ❌ |
| Approve admin actions | ✅ | ❌ | ❌ | ❌ |
| View finance data | ✅ | ✅ | ✅ | ❌ |
| View gameplay controls | ✅ | ✅ | ❌ | ✅ |
| View ledger entries | ✅ | ✅ | ✅ | ❌ |

### Endpoint-level RBAC

| Route group | Minimum role | Notes |
|------------|-------------|-------|
| Admin sessions (write) | ADMIN | Includes publish, open-registration, cancel, update |
| Admin sessions (read) | ADMIN/SUPER_ADMIN/FINANCE/SUPPORT | |
| Admin live (pause/resume) | ADMIN | |
| Admin lobby (start) | ADMIN | |
| Admin payments (list) | FINANCE/SUPER_ADMIN/ADMIN/SUPPORT | |
| Admin payments (reconcile) | FINANCE/SUPER_ADMIN | |
| Admin wallets (adjust) | FINANCE/SUPER_ADMIN | |
| Admin minigames | ADMIN | |
| Admin security (compliance) | ADMIN/SUPER_ADMIN/SUPPORT/FINANCE | |
| Admin security (moderation) | ADMIN/SUPER_ADMIN/SUPPORT | |
| Admin notifications (share) | ADMIN/SUPER_ADMIN/SUPPORT | |
| Admin operations (approve) | SUPER_ADMIN only | |

### Authentication
All admin routes use `requireAuth` middleware which validates `AuthSession` from cookie. All then use `requireRole(...)` for role-based access. `PLAYER` role is implicitly denied from all admin routes.

### Audit trail
Every mutating admin operation writes to `auditLog`:
- **Actor**: `userId` of the admin performing the action
- **Action**: Descriptive string (`session.draft-created`, `wallet.adjusted`, `payment.reconciliation-queued`, `moderation.action-applied`, etc.)
- **Entity/EntityId**: The affected database record
- **Reason**: Admin-provided justification (required on all mutation endpoints)
- **Context**: `requestId`, `ipAddress`, `userAgent` from the HTTP request
- **Snapshot**: `oldData` and `newData` (full serialized object for most operations)

### Finance scope isolation
The `financeAuditWhere` filter in `operations.ts` restricts FINANCE role to only see audit logs where `action` contains "payment" or "wallet", or `entity` is `PaymentTransaction`/`Wallet`/`LedgerEntry`/`PrizeDistribution`. This is enforced server-side in the `listAuditLogs` function.

### Sensitive field handling
- `deviceHash` and `ipHash` in risk signals are SHA256-hashed at input; only first 8 chars exposed in API output
- `oldData`/`newData` in audit logs are only exposed to ADMIN/SUPER_ADMIN
- `adminShareParamsSchema` validates session share parameters
- Wallet adjustment requires `idempotencyKey` to prevent duplicate adjustments
- Session updates use optimistic locking (`configVersion`) to prevent concurrent edits
- Sensitive session fields (`minPlayers`, `maxPlayers`, `entryFeeXaf`, `prizePoolBps`, `winnerSplitBps`, `providerFeeBps`) are locked from further edits once paid registrations exist
