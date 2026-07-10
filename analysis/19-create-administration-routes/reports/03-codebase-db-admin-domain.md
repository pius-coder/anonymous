# Report 03: Database/Admin Domain Discovery

## 1. Relevant Models & Enums

### Enums

| Enum | File:Line | Values |
|---|---|---|
| `UserRole` | `schema.prisma:11` | `PLAYER`, `SUPPORT`, `FINANCE`, `ADMIN`, `SUPER_ADMIN` |
| `SessionVisibility` | `schema.prisma:19` | `PUBLIC`, `UNLISTED`, `PRIVATE` |
| `GameSessionStatus` | `schema.prisma:25` | `DRAFT`, `PUBLISHED`, `ACTIVE`, `WAITING_START`, `LIVE`, `COMPLETED`, `CANCELLED` |
| `SessionRegistrationStatus` | `schema.prisma:35` | `CREATED`, `PAYMENT_PENDING`, `PAID`, `CHECKED_IN`, `IN_ROOM`, `NO_SHOW`, `CANCELLED`, `REFUNDED`, `EXPIRED` |
| `PaymentStatus` | `schema.prisma:47` | `PENDING`, `SUCCESSFUL`, `FAILED`, `EXPIRED`, `REFUNDED` |
| `LedgerDirection` | `schema.prisma:55` | `CREDIT`, `DEBIT` |
| `LedgerType` | `schema.prisma:60` | `ENTRY_FEE`, `PRIZE`, `REFUND`, `BONUS`, `ADJUSTMENT` |
| `IncidentSeverity` | `schema.prisma:125` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `SupportCaseStatus` | `schema.prisma:118` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `AdminActionApprovalStatus` | `schema.prisma:132` | `REQUESTED`, `APPROVED`, `REJECTED` |
| `ModerationActionType` | `schema.prisma:208` | `WARN_USER`, `FREEZE_WALLET`, `SUSPEND_USER`, `RESTRICT_SESSION`, `NOTE` |
| `ComplianceGateType` | `schema.prisma:196` | `WITHDRAWAL`, `MINI_GAME_RISK`, `LEGAL_WORDING`, `PUBLIC_LAUNCH` |
| `ComplianceGateStatus` | `schema.prisma:202` | `BLOCKED`, `PASSED`, `WAIVED` |
| `PrizeDistributionStatus` | `schema.prisma:100` | `PENDING`, `CREDITED`, `FAILED` |
| `DisputeWindowStatus` | `schema.prisma:111` | `OPEN`, `CORRECTION_REQUESTED`, `RESOLVED`, `CLOSED` |
| `GameResultStatus` | `schema.prisma:94` | `WINNER`, `ELIMINATED`, `COMPLETED` |
| `RoundStatus` | `schema.prisma:68` | `PENDING`, `ACTIVE`, `COMPLETED` |
| `LivePhase` | `schema.prisma:74` | `LOBBY`, `BRIEFING`, `ROUND_ACTIVE`, `RESOLVING`, `RESULTS`, `PAUSED` |
| `RiskSignalType` | `schema.prisma:177` | `AUTHORIZATION_DENIED`, `WEBHOOK_SIGNATURE_FAILURE`, `MULTI_ACCOUNT`, `DEVICE_HASH`, `PAYMENT_PATTERN`, `ANTICHEAT`, `COMPLIANCE` |
| `RiskSignalSeverity` | `schema.prisma:170` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `AntiCheatEventType` | `schema.prisma:187` | `DOUBLE_SUBMIT`, `AUTO_CLICK`, `LATE_INPUT`, `LATENCY_ABUSE`, `MANUAL_REVIEW` |
| `MiniGameFamily` | `schema.prisma:216` | `SOLO`, `DUEL`, `ALLIANCE`, `TEAM`, `SURVIVAL`, `HIDDEN_ROLE` |

### Core Models (admin-relevant)

| Model | File:Line | Key Fields | Admin Relevance |
|---|---|---|---|
| `User` | `schema.prisma:233` | `id`, `email`, `phone`, `role`, `isActive`, `sessionVersion` | Central to all admin workflows. Role-based access (PLAYER/SUPPORT/FINANCE/ADMIN/SUPER_ADMIN). |
| `PlayerProfile` | `schema.prisma:285` | `userId`, `username`, `level`, `xp`, `isPublic` | Admin can view/edit player profiles. |
| `PlayerStatsSnapshot` | `schema.prisma:303` | `userId`, `sessionsPlayed`, `sessionsWon`, `winRate`, `creditsWonXaf` | Admin dashboard aggregated stats. |
| `RoleAssignment` | `schema.prisma:355` | `userId`, `role`, `grantedById`, `reason`, `revokedAt` | Audit trail for role changes. Admin can grant/revoke roles. |
| `GameSession` | `schema.prisma:372` | `code`, `status`, `minPlayers`, `maxPlayers`, `entryFeeXaf`, `prizePoolBps`, `visibility`, `configVersion` | Full CRUD for admin. Lifecycle management (create/publish/cancel/finalize). |
| `SessionRegistration` | `schema.prisma:427` | `userId`, `sessionId`, `status`, `paymentDeadlineAt`, `checkedInAt` | Admin views registration status, capacity simulation. |
| `PaymentTransaction` | `schema.prisma:544` | `userId`, `sessionId`, `amountXaf`, `status`, `provider`, `providerTransId` | Finance admin views/reconciles payments. |
| `Wallet` | `schema.prisma:594` | `userId`, `balanceXaf`, `isFrozen`, `version` | Finance admin adjusts wallets, freezes/unfreezes. |
| `LedgerEntry` | `schema.prisma:610` | `walletId`, `userId`, `amountXaf`, `direction`, `type`, `idempotencyKey` | Admin views ledger, aggregates prize distributions. |
| `AuditLog` | `schema.prisma:932` | `userId`, `action`, `entity`, `entityId`, `oldData`, `newData`, `reason`, `requestId` | All admin actions logged. Dashboard lists/filters audit trails. |
| `SupportCase` | `schema.prisma:955` | `userId`, `createdById`, `status`, `subject`, `resolution` | Admin CRUD for player support. |
| `IncidentLog` | `schema.prisma:976` | `createdById`, `sessionId`, `severity`, `category`, `title` | Admin incident management. |
| `AdminActionApproval` | `schema.prisma:997` | `action`, `entity`, `entityId`, `status`, `requestedById`, `approvedById`, `payload`, `beforeData`, `afterData` | Two-person approval workflow for sensitive actions. SUPER_ADMIN approves. |
| `RiskSignal` | `schema.prisma:1024` | `type`, `severity`, `userId`, `sessionId`, `deviceHash`, `ipHash` | Security admin reviews risks. |
| `ComplianceGate` | `schema.prisma:1066` | `type`, `status`, `scope`, `reason`, `evidence`, `decidedById` | Admin manages compliance gates. |
| `ModerationAction` | `schema.prisma:1086` | `type`, `targetUserId`, `sessionId`, `actorId`, `reason` | Admin takes moderation actions (warn, freeze, suspend). |
| `MiniGameDefinition` | `schema.prisma:666` | `key`, `name`, `family`, `playerMode`, `resolverId`, `enabled`, `version` | Admin enables/disables mini-games, manages catalogue. |
| `GameResult` | `schema.prisma:845` | `sessionId`, `userId`, `finalRank`, `finalStatus`, `prizeWonXaf` | Admin views final results. |
| `PrizeDistribution` | `schema.prisma:869` | `sessionId`, `userId`, `amountXaf`, `rank`, `status` | Admin monitors prize crediting. |
| `CommissionRecord` | `schema.prisma:893` | `sessionId`, `grossCollectionXaf`, `netCollectionXaf`, `organizationCommissionXaf` | Financial admin views session commission. |
| `DisputeWindow` | `schema.prisma:911` | `sessionId`, `status`, `requestedById`, `closesAt` | Admin handles disputes/corrections. |
| `LiveSessionState` | `schema.prisma:476` | `sessionId`, `roomId`, `phase`, `currentRoundId` | Admin views/monitors live session phase. |
| `NotificationJob` | `schema.prisma:1137` | `userId`, `sessionId`, `type`, `channel`, `status` | Admin views notification status. |
| `RateLimitBucket` | `schema.prisma:1050` | `scope`, `key`, `count`, `resetAt`, `blockedAt` | Admin security monitoring. |

---

## 2. Existing Seed Data

File: `packages/db/prisma/seed.ts`

### Admin user (line 153):
- email: `admin@session-jeu.com`
- Password: `AdminLocal2026!` (local default, overridable via `SEED_ADMIN_PASSWORD`)
- Role: `ADMIN`
- Profile: username `admin`
- RoleAssignment: `seed-admin-role-assignment` with `reason: "seed-admin-local"`

### Players (lines 176, 321, 340):
- `player@session-jeu.com` / `testplayer` — wallet: 10000 XAF
- `player2@session-jeu.com` / `player2`
- `player3@session-jeu.com` / `player3`
- Default password: `PlayerLocal2026!` (overridable via `SEED_PLAYER_PASSWORD`)

### Game Sessions (lines 204-305):
1. **TEST-PUBLIC-001** — PUBLISHED, 10-20 players, 1000 XAF entry, public, July 15
2. **NIGHT-DROP-001** — ACTIVE, 8-15 players, 500 XAF entry, public, July 12
3. **UNLISTED-SESSION** — PUBLISHED, 5-10 players, 500 XAF, unlisted, July 14
4. **TEST-PRIVATE-001** — DRAFT, 2-5 players, 2000 XAF, private, no date

### Registrations (lines 308-394):
- player → public session 1: PAID
- player2 → public session 1: PAYMENT_PENDING
- player3 → public session 1: CANCELLED
- player → public session 2: PAID

### Mini-game definitions (lines 50-142, seeded 411-440):
5 definitions: memory-sequence, rapid-calculation, pure-reaction-duel, target-precision, safe-zones. Created by admin user.

---

## 3. Migration State

All 16 migration folders in `packages/db/prisma/migrations/`:

| Migration | Feature | Admin-relevant tables |
|---|---|---|
| `20260707213516_init` | Initial schema | `User`, `GameSession`, `SessionRegistration`, `PaymentTransaction`, `Wallet`, `LedgerEntry`, `AuditLog`, `GameResult`, `PrizeDistribution`, `ShareLink` |
| `20260708000000_feature_02_auth` | Auth & RBAC | `User` (`passwordHash`, `isActive`, `sessionVersion`), `AuthSession`, `PasswordResetToken`, `RoleAssignment`. **UserRole enum expanded**: PLAYER, SUPPORT, FINANCE, ADMIN, SUPER_ADMIN (replaced ORGANIZER). `AuditLog` gains `reason` + `requestId`. |
| `20260708010000_feature_04_admin_sessions` | Admin session config | `GameSession` adds: `minPlayers`, `entryFeeXaf`, `prizePoolBps`, `winnerSplitBps`, `providerFeeBps`, `configVersion`, `registrationClosesAt`, `publishedAt`, `cancelledAt`, `cancellationReason`. DB constraints for capacity and BPS ranges. |
| `20260708020000_feature_05_session_registration` | Registration flow | `SessionRegistrationStatus` enum refined with detailed states (CREATED, PAYMENT_PENDING, PAID, CHECKED_IN, IN_ROOM, NO_SHOW, CANCELLED, REFUNDED, EXPIRED). Additional registration fields. |
| `20260708030000_feature_06_fapshi_payments` | Payments | `PaymentTransaction` enhanced: `amountXaf`, `providerExternalId`, `providerTransId`, `providerStatus`, `checkoutUrl`, `webhookReceivedAt`. `WebhookEvent` table added. |
| `20260708040000_feature_07_wallet_ledger` | Wallet/Ledger | `Wallet` gains `isFrozen`, `version`, `balanceXaf`. `LedgerEntry` gains `amountXaf`, `balanceAfterXaf`, `referenceType`, `referenceId`, `idempotencyKey`. `ADJUSTMENT` added to `LedgerType`. |
| `20260708050000_feature_08_lobby_check_in` | Lobby/Check-in | `SessionRegistration` gains check-in fields. `JoinToken` table. |
| `20260708060000_feature_09_live_realtime` | Live/Real-time | `LiveSessionState`, `LiveReservation`, `PlayerConnection` tables. `WAITING_START`, `LIVE` added to `GameSessionStatus`. LivePhase enum. |
| `20260708070000_feature_10_game_engine_resolution` | Game engine | `RoundInstance`, `RoundDeadline`, `PlayerAction`, `RoundOutcome`, `ResolutionLog`, `GameEvent` tables. `RoundResult` table enhanced. |
| `20260708080000_feature_11_minigame_catalogue` | Mini-game catalogue | `MiniGameDefinition` table. `MiniGameFamily`, `MiniGamePlayerMode` enums. |
| `20260708090000_feature_12_results_distribution` | Results/Prizes | `GameResult`, `PrizeDistribution`, `CommissionRecord`, `DisputeWindow` tables enhanced. `GameResultStatus`, `PrizeDistributionStatus`, `RoundingRemainderPolicy` enums. |
| `20260708090000_fix_schema_drift` | Schema drift fix | Removed legacy `isPublic` boolean from `GameSession`, backfilled `visibility`. Dropped defaults on `winnerSplitBps`, `amountXaf`, `balanceAfterXaf`. |
| `20260708100000_feature_03_player_profile_history` | Player profile | `PlayerProfile` gains `avatarUrl`, `preferences`, `isPublic`. `PlayerStatsSnapshot` table added. |
| `20260708110000_feature_13_admin_dashboard_audit_support` | **Admin dashboard** | `SupportCase`, `IncidentLog`, `AdminActionApproval` tables. `SupportCaseStatus`, `IncidentSeverity`, `AdminActionApprovalStatus` enums. |
| `20260708120000_feature_14_notifications_whatsapp` | Notifications | `NotificationPreference`, `MessageTemplate`, `NotificationJob`, `DeliveryLog`, `ConsentRecord`, `OutboundMessage` tables. Notification enums. |
| `20260708130000_feature_15_security_anticheat_compliance` | Security/Compliance | `AntiCheatEvent`, `RiskSignal`, `RateLimitBucket`, `ComplianceGate`, `ModerationAction` tables. Security-related enums. |

---

## 4. Query Include/Select Patterns

### Admin Session CRUD (`apps/api/src/routes/admin/sessions.ts`)

**Create session (line 194)**:
```ts
tx.gameSession.create({ data: { code, name, ... } })
// No include/select — returns full session
```

**List sessions (line 249)**:
```ts
prisma.gameSession.findMany({
  where: { status },           // optional status filter
  skip, take: limit,
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        registrations: {
          where: { status: { in: [PAYMENT_PENDING, PAID] } }
        }
      }
    }
  }
})
```

**Get session detail (line 289)**:
```ts
prisma.gameSession.findUnique({
  where: { id },
  include: {
    registrations: {
      include: {
        user: { select: { id, email, name, role } },
        payment: { select: { id, status, amountXaf, providerTransId, createdAt } }
      },
      orderBy: { createdAt: "desc" }
    },
    rounds: { orderBy: { order: "asc" } },
    liveState: true,
    gameResults: { orderBy: { finalRank: "asc" } },
    commissionRecord: true,
    disputeWindow: true
  }
})
```

**Simulation (line 384)**: `prisma.gameSession.findUnique({ where: { id } })` — no includes, then separate count.
**Update/Publish/Cancel (lines 421, 511, 561, 579, 630, 684)**: All use `findUnique` first (no includes), then `updateMany` with OCC on `configVersion`, then `findUniqueOrThrow`.

### Admin Dashboard (`apps/api/src/admin/operations.ts`)

**Dashboard counts (lines 135-155)**: 13 parallel `prisma.model.count()` calls with `where` filters, plus one `prisma.ledgerEntry.aggregate({ _sum: { amountXaf } })`. No includes.

**Audit log listing (line 210)**:
```ts
prisma.auditLog.findMany({
  where: { userId, action: { contains }, entity, entityId, requestId },
  take: limit + 1,
  cursor: { id: cursor }, skip: 1,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }]
})
```
- Role-based filtering: FINANCE role sees only payment/wallet/ledger-related entries (line 106-115).
- Sensitive data redacted for SUPPORT role (line 218).

**Support user view (line 241)**:
```ts
prisma.user.findUnique({
  where: { id },
  select: {
    id, email, phone, name, role, isActive, createdAt,
    profile: { select: { username, avatarUrl, isPublic, level, xp } },
    wallet: {
      select: { id, balanceXaf, currency, isFrozen, updatedAt,
        ledgers: matrix.canViewLedger ? { take: 20, orderBy, select: { ... } } : false
      }
    },
    registrations: { take: 10, orderBy, select: { id, status, createdAt, session: { select: { id, code, name, status, startTime } } } },
    supportCasesForUser: { take: 10, orderBy, select: { id, status, subject, createdAt, closedAt } }
  }
})
// Separate query:
prisma.paymentTransaction.findMany({
  where: { userId },
  take: 10, orderBy,
  select: { id, sessionId, registrationId, amountXaf, currency, status, provider, providerStatus, reference, createdAt, updatedAt }
})
```

**Create support case (line 398)**: `tx.supportCase.create` + `tx.auditLog.create` in transaction.
**Create incident (line 429)**: `tx.incidentLog.create` + `tx.auditLog.create` in transaction.
**Create admin action request (line 467)**: `tx.adminActionApproval.create` + `tx.auditLog.create` in transaction.
**Approve admin action (line 507)**: `prisma.adminActionApproval.findUnique` → check → `tx.adminActionApproval.update` + `tx.auditLog.create`.

### Admin Payments (`apps/api/src/routes/admin/payments.ts`)
**Line 43-50**: `prisma.paymentTransaction.count/findMany` with status/provider filters.
**Line 99**: `prisma.paymentTransaction.findUnique({ where: { id }, include: { registration: true } })`.

### Admin Wallets (`apps/api/src/routes/admin/wallets.ts`)
- Delegates to `adjustWallet()` in `apps/api/src/wallet/wallet.ts`:
  - `tx.user.findUnique({ where: { id }, select: { id: true } })` (line 326)
  - `tx.ledgerEntry.findUnique({ where: { idempotencyKey } })` (line 332) — idempotency check
  - `tx.wallet.upsert` / `tx.wallet.update` + `tx.ledgerEntry.create` + `tx.auditLog.create` in transaction

### Admin Results (`apps/api/src/routes/admin/results.ts`)
- Delegates to `finalizeSessionResults()` in `apps/api/src/results/results.ts`:
  - `tx.commissionRecord.findUnique({ where: { sessionId } })` (line 214) — already finalized check
  - `tx.gameSession.findUnique({ where: { id }, include: { registrations: { where: { status: PAID } }, rounds: { include: { results: true, outcomes: true } } } })` (line 221)
  - Batch creates: `tx.gameResult.createMany`, `tx.prizeDistribution.createMany`, `tx.commissionRecord.create`, `tx.disputeWindow.create`
  - `tx.gameSession.update({ where: { id }, data: { status: COMPLETED } })` (line 362)

### Admin Lobby (`apps/api/src/routes/admin/lobby.ts`)
- Delegates to `authorizeSessionStart()` in `apps/api/src/lobby/lobby.ts`:
  - `tx.gameSession.findUnique({ where: { id } })` (line 277)
  - `tx.sessionRegistration.count({ where: { sessionId, status: CHECKED_IN } })` (line 297)
  - `tx.gameSession.update({ where: { id }, data: { status: WAITING_START } })` (line 312)

### Admin Live (`apps/api/src/routes/admin/live.ts`)
- `pauseLiveSession()`: `tx.gameSession.findUnique` → `tx.liveSessionState.findUnique` / `tx.liveSessionState.upsert` + `tx.auditLog.create`
- `resumeLiveSession()`: Same pattern with phase update.

### Admin Mini-games (`apps/api/src/routes/admin/minigames.ts`)
- Delegates to `apps/api/src/minigames/catalogue.ts`:
  - `prisma.miniGameDefinition.findMany({ orderBy: [{ family: "asc" }, { key: "asc" }, { version: "desc" }] })` (line 208)
  - `prisma.miniGameDefinition.update({ where: { id }, data: { enabled } })` + `prisma.auditLog.create` (line 214-218)

### Admin Security (`apps/api/src/routes/admin/security.ts`)
- Delegates to `apps/api/src/security/security.ts`:
  - Compliance: `prisma.complianceGate.findMany`, `prisma.complianceGate.findFirst`, `prisma.complianceGate.upsert`
  - Moderation: `tx.moderationAction.create` + side effects (`tx.wallet.updateMany isFrozen`, `tx.user.update isActive`) + `tx.auditLog.create`

### Admin Notifications (`apps/api/src/routes/admin/notifications.ts`)
- `prisma.gameSession.findUnique({ where: { id }, select: { visibility: true } })` — refuses PRIVATE sessions
- Then creates notification jobs via `apps/api/src/notifications/notifications.ts`

### Role-Based Access Control Matrix

Defined in `apps/api/src/admin/operations.ts:76-88`:

| Capability | PLAYER | SUPPORT | FINANCE | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| View Dashboard | - | ✓ | ✓ | ✓ | ✓ |
| View Audit Logs | - | ✓ (redacted) | ✓ (finance only) | ✓ | ✓ |
| View Support Users | - | ✓ | ✓ | ✓ | ✓ |
| Create Incidents | - | ✓ | - | ✓ | ✓ |
| Request Admin Actions | - | - | - | ✓ | ✓ |
| Approve Admin Actions | - | - | - | - | ✓ |
| View Finance Data | - | - | ✓ | ✓ | ✓ |
| View Gameplay Controls | - | ✓ | - | ✓ | ✓ |
| View Ledger | - | - | ✓ | ✓ | ✓ |

### Authorization Middleware Patterns

| Pattern | File | Used For |
|---|---|---|
| `requireRole("ADMIN", "SUPER_ADMIN")` | `routes/admin/sessions.ts:31` | Session create/update/publish/cancel, simulation, lobby, live, minigame management |
| `requireRole("ADMIN", "SUPER_ADMIN", "FINANCE", "SUPPORT")` | `routes/admin/sessions.ts:33` | Session list/detail, dashboard, audit logs, support user view |
| `requireRole("FINANCE", "SUPER_ADMIN")` | `routes/admin/wallets.ts` + `wallet/wallet.ts:326` | Wallet adjustments |
| `requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT")` | `operations.ts:23` | Incident creation, moderation actions |

### Common Query Patterns

1. **OCC (Optimistic Concurrency Control)**: All session mutations use `configVersion` + `updateMany` with `where: { id, configVersion }`. If count !== 1, returns 409 CONFIG_VERSION_CONFLICT.

2. **Idempotency Keys**: Used in `ledgerEntry` (unique `idempotencyKey`), `gameResult` (unique `idempotencyKey`), `prizeDistribution` (unique `idempotencyKey`), `commissionRecord` (unique `idempotencyKey`), `notificationJob` (unique `idempotencyKey`).

3. **Cursor-based pagination**: Audit logs use cursor pagination with `cursor: { id }` + `skip: 1`. Session listings use offset pagination with `skip`/`take`.

4. **Transactional audit logging**: Every admin mutation wraps the data change + `auditLog.create` in a `$transaction`. Actions logged: `session.draft-created`, `session.config-updated`, `session.published`, `session.registration-opened`, `session.cancelled`, `incident.created`, `support.case-created`, `admin.action-requested`, `admin.action-approved`, `wallet.adjusted`, `results.finalized`.

5. **Data redaction by role**: `AuditLog.oldData`/`newData` are `null` for SUPPORT/FINANCE roles (line 217-218). Provider details (`provider`, `providerStatus`, `providerTransId`) are excluded from SUPPORT user view (line 321-333).

---

## 5. Existing DB Tests Relevant to Admin Workflows

All tests are in `apps/api/src/routes/__tests__/` and use `vi.mock("@session-jeu/db")` — no real DB connection.

### Admin Route Tests (10 files)

| File | What It Tests |
|---|---|
| `admin-sessions.test.ts` | **Session CRUD lifecycle**: create draft, publish, open registration, cancel, update with OCC, financial simulation, paid-registrations guard, compliance gate blocking, RBAC enforcement (PLAYER denied). Verifies `auditLog.create` calls with correct actions. |
| `admin-operations.test.ts` | **Dashboard KPIs**, role-scoped dashboard (SUPPORT sees less), audit log filtering (entity, entityId, requestId), support user view (provider secrets hidden for SUPPORT), incident creation (requires reason), admin action approval (self-approval blocked), audit deletion route returns 404 (immutability). |
| `admin-payments.test.ts` | **Payment reconciliation**: Finance role queues manual reconciliation, requires reason, 404 for unknown payment, non-FINANCE rejected. |
| `admin-wallets.test.ts` | **Wallet adjustment**: Finance adjusts wallet with reason + idempotency key, missing reason rejected, non-FINANCE rejected. |
| `admin-lobby.test.ts` | **Session start**: Admin starts lobby, checks min checked-in players, rejects when min not met, non-admin rejected. |
| `admin-results.test.ts` | **Results finalization**, tie policy validation, correction requests by support. |
| `admin-minigames.test.ts` | **Catalogue management**: list, enable/disable, validate configs, chance-dominant risk blocking. |
| `admin-security.test.ts` | **Security**: list compliance gates, create moderation actions (WARN_USER etc.), player access rejected. |
| `admin-notifications.test.ts` | **Notifications**: create private-safe admin share messages, refuse PRIVATE sessions, player access rejected. |
| `admin-live.test.ts` | **Live session**: pause/resume, reason audit, non-admin rejected. |

### Service-Level Tests

| File | What It Tests |
|---|---|
| `apps/api/src/admin/__tests__/sessionConfig.test.ts` | Pure unit: BPS calculations, Zod schema validation, session code generation. **No DB mock.** |
| `apps/api/src/wallet/__tests__/wallet.test.ts` | `adjustWallet` (admin action), `computeLedgerBalanceXaf`, `payRegistrationWithWallet`. Mocked DB. |
| `apps/api/src/security/__tests__/security.test.ts` | Compliance gates (chance-dominant, public launch blocking), anti-cheat signal creation. Mocked DB. |
| `apps/api/src/results/__tests__/results.test.ts` | Prize distribution formulas, BPS calculations, rounding remainder policies. **No DB mock.** |
| `apps/api/src/notifications/__tests__/notifications.test.ts` | Share message building, private session refusal, WhatsApp opt-in skip. Mocked DB. |

### Key Testing Patterns

- **Mock architecture**: `vi.hoisted()` creates `dbMocks` with `dbMocks.prisma` (direct) and `dbMocks.tx` (transactional). `$transaction` calls through: `async (cb) => cb(dbMocks.tx)`.
- **Auth mocking**: `prisma.authSession.findUnique` returns user session with configurable role.
- **Audit verification**: Every route test asserts `dbMocks.tx.auditLog.create` called with correct `action`, `reason`, `requestId`.
- **No integration tests**: Zero tests connect to a real DB. No test database, no migration in tests, no Docker, no testcontainers.
- **No E2E for admin**: Only E2E test (`feature-01-catalogue-public.spec.ts`) covers public catalogue.

### Gaps Identified

1. No DB integration tests for any admin workflow
2. No tests for `RoleAssignment` CRUD or role-granting flows
3. No tests for bulk user search/management
4. No tests for admin notification broadcast
5. No tests for admin security dashboard (risk signals, anti-cheat events)
6. No tests for wallet freeze/unfreeze moderation chain
7. No E2E tests for admin UI flows
