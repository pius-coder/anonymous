# APEX Step 02: Plan — P-A-NOTIFICATIONS - Outbox et provider reel

## Implementation Plan

### Overview
Connect existing notification infrastructure to a real WhatsApp provider, implement the outbox pattern (enqueue after transaction), add template/consent/DLQ/Scheduler support, expose notification RPC endpoints, and wire the web UI.

---

### Phase 1: Provider SDK Integration

#### `apps/whatsapp-gateway/package.json`
- Add `@great-detail/whatsapp` (^9.1.0) to dependencies

#### `apps/whatsapp-gateway/src/provider/production.ts` (REWRITE)
- Replace fail-closed stub with real SDK integration
- Constructor: accept `WhatsAppProviderConfig` (token, phoneNumberId, businessAccountId, apiVersion)
- `send(message)`: use `@great-detail/whatsapp` Client to send template/text messages
- Error mapping:
  - Network/timeout → `SendFailure { retryable: true, errorCode: "PROVIDER_UNAVAILABLE" }`
  - 429 rate limit → `SendFailure { retryable: true, errorCode: "RATE_LIMITED" }`
  - 400 invalid recipient → `SendFailure { retryable: false, errorCode: "INVALID_RECIPIENT" }`
  - Other 4xx → `SendFailure { retryable: false, errorCode: "PROVIDER_REJECTED" }`
  - 5xx → `SendFailure { retryable: true, errorCode: "PROVIDER_ERROR" }`
- Use `redactPhone` and `redactText` on logs
- `createProductionProviderFromEnv()`: read `WHATSAPP_PROVIDER_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_VERSION` from env
- Add `timeout`: 10s default via `request.timeout` or `signal: AbortSignal.timeout(10000)`
- Add name: `"whatsapp-production"`

#### `apps/whatsapp-gateway/src/provider/types.ts`
- Add `WhatsAppProviderConfig` type:
```ts
export type WhatsAppProviderConfig = {
  token: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion?: string;
};
```

#### `apps/whatsapp-gateway/src/index.ts`
- Re-export `WhatsAppProviderConfig`, `WhatsAppProviderOptions`

#### `.env.example`
- Add `WHATSAPP_PHONE_NUMBER_ID=`, `WHATSAPP_BUSINESS_ACCOUNT_ID=`, `WHATSAPP_API_VERSION=v23.0`

#### `apps/whatsapp-gateway/src/__tests__/production.test.ts` (NEW)
- Test that provider with token sends via SDK
- Test rate-limited → retryable
- Test invalid recipient → non-retryable
- Test timeout → retryable
- Test without token → `PROVIDER_NOT_CONFIGURED`

---

### Phase 2: Template System

#### `packages/db/prisma/schema.prisma`
- Add `NotificationTemplate` model:
  - `id` String @id @default(cuid())
  - `key` String (unique) — e.g. "password_reset", "preparation_announcement"
  - `version` Int (default 1)
  - `channel` String — "whatsapp"
  - `language` String — "fr", "en"
  - `templateName` String — WhatsApp template name
  - `bodyTemplate` String — with {{variable}} placeholders
  - `titleTemplate` String? — optional title
  - `isActive` Boolean (default true)
  - `createdAt`, `updatedAt`
  - `@@unique([key, version, language])`

#### `packages/db/src/repositories/notification-template.repository.ts` (NEW)
- `findActiveTemplate(key, channel, language)` → resolves best match
- `listTemplates()` → all active templates
- `createTemplate(data)` → insert
- Follow pattern of `notification.repository.ts`

#### `packages/db/src/repositories/types.ts`
- Add `CreateNotificationTemplateData` type

#### `packages/db/src/repositories/index.ts`
- Export `notificationTemplateRepository`

#### `apps/worker/src/templates/template-renderer.ts` (NEW)
- `renderTemplate(template, variables: Record<string, string>)` → `{ title, body }`
- Replace {{variable}} patterns with values
- Validate required variables present

---

### Phase 3: Outbox Producer (Enqueue from Use-Cases)

#### `apps/api/src/use-cases/notification/notification.use-case.ts` (NEW)
- `sendNotification(userId, type, payload, options?)` → creates NotificationJob + enqueues to BullMQ
- `listUserNotifications(userId, limit, offset)` → lists with delivery status
- `acknowledgeNotification(notificationJobId, userId)` → marks as read/acknowledged
- `getNotificationStatus(notificationJobId)` → delivery log status
- Uses `@session-jeu/db` notificationRepository + BullMQ `Queue`

#### `apps/api/src/use-cases/notification/index.ts` (NEW)
- Re-export all use-case functions

#### `apps/api/src/rpc/notification-service.ts` (NEW)
- Implement `NotificationV1.NotificationService` with 4 RPC handlers:
  - `SendNotification` → calls notification use-case
  - `GetNotificationStatus` → queries delivery status
  - `ListNotifications` → lists user notifications
  - `AcknowledgeNotification` → marks as acknowledged

#### `apps/api/src/rpc/routes.ts`
- Import and register `NotificationV1.NotificationService`

#### `apps/api/src/use-cases/auth/auth.use-case.ts`
- After `notificationRepository.createNotificationJob()` (line ~151), call `enqueueNotificationDelivery()`
- Need access to BullMQ queue

#### `apps/api/src/use-cases/preparation/preparation.use-case.ts`
- After `$transaction` creating NotificationJobs (line ~479), enqueue each job ID to BullMQ

---

### Phase 4: Consent/Opt-out

#### `apps/worker/src/jobs/notificationDelivery.ts`
- Before sending, check user consent via `ConsentRecord`
- Skip with `"SKIPPED_CONSENT"` reason if user has withdrawn consent for notification type
- Add constant: `CONSENT_POLICY_KEY = "notification"`

#### `apps/worker/src/consent.ts` (NEW)
- `hasNotificationConsent(userId, type)` → checks `ConsentRecord` table
- `filterConsentingUsers(userIds, type)` → returns only users with active consent

---

### Phase 5: DLQ (Dead Letter Queue)

#### `apps/worker/src/queues.ts`
- Add `DLQ_QUEUE_NAME = "notification-delivery-dlq"` constant
- Add `createDlqQueue(config)` → creates BullMQ Queue for DLQ
- Add `enqueueToDlq(queue, failedJob)` → moves exhausted job to DLQ

#### `apps/worker/src/runner.ts`
- Add `retries-exhausted` event handler via `QueueEvents` or worker `failed` event
- When `attemptsMade >= maxAttempts`, move job to DLQ queue
- Log DLQ move with redacted payload

#### `apps/worker/config.ts`
- Add `DLQ_PREFIX` or just reuse existing prefix with `-dlq` suffix

---

### Phase 6: Scheduler

#### `apps/worker/src/jobs/outboxScheduler.ts` (NEW)
- `scanPendingJobs()` → queries `listPendingNotificationJobs()` and enqueues each to BullMQ
- Handles already-enqueued jobs via BullMQ `jobId` dedup
- Scheduled via setInterval or BullMQ repeatable jobs

#### `apps/worker/src/runner.ts`
- Add scheduler start/stop alongside workers
- Schedule `scanPendingJobs()` every 5 seconds (configurable)

---

### Phase 7: Web UI

#### `apps/web/src/app/(client)/me/notifications/page.tsx`
- Replace mock data with real RPC call
- Fetch via `listNotifications()` from rpcServices
- Show title, body, status, timestamp
- Loading/empty/error states

#### `apps/web/src/services/rpcServices.ts` (already has facade)
- Verify `list()`, `status()`, `send()` match proto

---

### Phase 8: Metrics & Observability

#### `apps/worker/src/metrics.ts`
- Add queue-specific metrics: `queueAge`, `queueDepth`
- Add histogram for delivery latency

#### `apps/worker/RUNBOOK.md`
- Add DLQ replay procedure
- Add provider secret rotation procedure
- Add alert thresholds

---

### Testing Strategy

**Unit tests:**
- `apps/whatsapp-gateway/src/__tests__/production.test.ts` — provider happy path, errors, timeout
- `apps/worker/src/__tests__/template-renderer.test.ts` — template rendering
- `apps/api/src/use-cases/notification/__tests__/notification.use-case.test.ts` — outbox, list, ack
- `apps/worker/src/__tests__/consent.test.ts` — consent check, filtering

**Integration (L3):**
- `apps/worker/src/__tests__/l3-workers.integration.test.ts` — add DLQ test case, consent skip test

**Provider contract (L4):**
- Provider sandbox contract test with `@great-detail/whatsapp`

**E2E (L5):**
- Reset/announcement flow reaches real terminal

---

### Acceptance Criteria Mapping

- [ ] AC1: Phase 3 — outbox enqueue in use-cases + scheduler
- [ ] AC2: Phase 1 — real WhatsApp provider integration
- [ ] AC3: Phase 2 — template versioning, language, rendering
- [ ] AC4: Phase 4 — consent check before delivery
- [ ] AC5: Phase 5 — DLQ for exhausted retries
- [ ] AC6: Phase 3+5 — idempotent enqueue + crash-safe delivery
- [ ] AC7: Phase 6 — scheduler for pending jobs
- [ ] AC8: Phase 8 — metrics, runbooks, alert docs

---

## Step Complete
**Status:** ✓ Complete
**Files planned:** ~25 files (new + modified)
**Tests planned:** 5 new test files + 2 updated
**Next:** step-03-execute.md
