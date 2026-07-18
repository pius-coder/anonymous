# APEX Step 01: Analyze — P-A-NOTIFICATIONS - Outbox et provider reel

## Codebase Context

### Notification Layer (existing, complete)
| File | Lines | Contains |
|------|-------|----------|
| `packages/db/prisma/schema.prisma` | 714-754 | `NotificationJob` model (id, userId, type, payload, status, idempotencyKey, claimToken, attempts, maxAttempts, availableAt), `DeliveryLog` model (id, jobId, channel, status, error) |
| `packages/db/src/repositories/notification.repository.ts` | 1-193 | Full repository: create (idempotency check), claim (serializable tx), complete, fail, createDeliveryLog |
| `packages/contracts/proto/notification/v1/notification.proto` | 1-137 | Full protobuf: `NotifChannel`, `NotifDeliveryStatus`, `NotifType` enums. Service with 4 RPCs. |
| `packages/contracts/src/gen/notification/v1/notification_pb.ts` | 607 | Generated TS types/enums |

### Worker Layer (existing, operational)
| File | Lines | Contains |
|------|-------|----------|
| `apps/worker/src/config.ts` | 1-47 | `QUEUE_NAMES.NOTIFICATION = "notification-delivery"`, `maxAttempts: 5`, `backoffDelayMs: 1000` |
| `apps/worker/src/queues.ts` | 1-106 | `createQueues()`, `enqueueNotificationDelivery()` with stable `notif-{id}` jobId |
| `apps/worker/src/runner.ts` | 1-176 | `createWorkerRunner()` with 3 BullMQ Workers, graceful shutdown |
| `apps/worker/src/jobs/notificationDelivery.ts` | 1-152 | `deliverNotificationJob()` — idempotent provider send, status flow PENDING→PROCESSING→SENT\|FAILED |
| `apps/worker/src/redis.ts` | 1-53 | BullMQ connection from `REDIS_URL`, each queue gets own ioredis connection |
| `apps/worker/src/logging.ts` | 1-39 | JSON logger with correlationId, redaction |
| `apps/worker/src/metrics.ts` | 1-45 | In-process counters: success, retry, failure, skipped |

### WhatsApp Gateway Layer (port + fake + fail-closed production)
| File | Lines | Contains |
|------|-------|----------|
| `apps/whatsapp-gateway/src/provider/types.ts` | 1-35 | `NotificationProvider` interface: `send(message): SendResult` |
| `apps/whatsapp-gateway/src/provider/fake.ts` | 1-47 | `FakeNotificationProvider` — records sent messages, configurable failure |
| `apps/whatsapp-gateway/src/provider/production.ts` | 1-60 | `ProductionWhatsAppProvider` — fail-closed: returns `PROVIDER_NOT_CONFIGURED` / `PROVIDER_SDK_NOT_WIRED` |
| `apps/whatsapp-gateway/src/redaction.ts` | 1-50 | `redactPhone`, `redactText`, `redactForLog` |

### Existing Producers (create NotificationJob but DON'T enqueue to BullMQ)
| Use-case | File:Line | Notification Type |
|----------|-----------|-------------------|
| `requestPasswordReset` | `apps/api/src/use-cases/auth/auth.use-case.ts:142` | `PASSWORD_RESET` |
| `sendPreparationAnnouncement` | `apps/api/src/use-cases/preparation/preparation.use-case.ts:462` | `PREPARATION_ANNOUNCEMENT` (one per recipient) |

### Web UI (mock only)
| File | Lines | Contains |
|------|-------|----------|
| `apps/web/src/app/(client)/me/notifications/page.tsx` | 1-17 | Mock UI, hardcoded data |
| `apps/web/src/services/rpcServices.ts` | 229-252 | `NotificationService` facade |
| `apps/web/src/lib/rpc.ts` | 47 | `notifications: createClient(NotificationV1.NotificationService, transport)` |

### API RPC (not registered yet)
- `apps/api/src/rpc/routes.ts` — NO `NotificationService` registered
- No ConnectRPC handlers for the 4 notification RPCs

## Key Gaps (What Must Be Built)

1. **Outbox pattern**: NotificationJobs are created in DB but never enqueued to BullMQ. Need to call `enqueueNotificationDelivery()` in auth and preparation use-cases.
2. **Real provider**: `ProductionWhatsAppProvider` is fail-closed. Need to integrate `@great-detail/whatsapp` SDK or equivalent.
3. **Template storage/rendering**: `template_key` exists in proto but no template DB model, repository, or rendering engine.
4. **Consent/opt-out**: `ConsentRecord` model exists in Prisma but no notification-specific opt-out logic.
5. **DLQ**: No dead letter queue — jobs exhausting retries just stay in failed set.
6. **Scheduler**: No periodic delivery scan for pending jobs.
7. **API endpoints**: No ConnectRPC handlers for `NotificationService`.
8. **Web UI**: Mock only, no real RPC integration for `/me/notifications`.

## Provider Decision

**Chosen: `@great-detail/whatsapp`** — most mature fork of Meta's official SDK, TypeScript, ESM/CJS, auto-retry, full Cloud API v23 support.

## Inferred Acceptance Criteria

- [ ] AC1: Outbox pattern — NotificationJob created in business transaction + enqueued idempotently to BullMQ
- [ ] AC2: Real provider — `@great-detail/whatsapp` integrated as `ProductionWhatsAppProvider` with sandbox/live
- [ ] AC3: Templates — versioned template storage with language support and rendering
- [ ] AC4: Consent — opt-out applied before delivery, RBAC support
- [ ] AC5: Retries/DLQ — transient errors retry (exponential backoff), permanent errors go to DLQ
- [ ] AC6: Crash safety — crash before/after send produces no undetected duplicates
- [ ] AC7: Scheduler — periodic scan for pending/abandoned delivery jobs
- [ ] AC8: Metriques — queue age, retry, failure metrics; runbooks provider/secret
