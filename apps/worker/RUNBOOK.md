# Worker RUNBOOK — operation

## Demarrage

```bash
# Depuis le worktree (charge REDIS_URL / DATABASE_URL)
scripts/worktree-run pnpm --filter @session-jeu/worker start

# Ou en dev
scripts/worktree-run pnpm --filter @session-jeu/worker dev
```

Variables cles :

| Variable | Defaut | Role |
|---|---|---|
| `REDIS_URL` | `redis://127.0.0.1:6379` | Backend BullMQ |
| `REDIS_DB` | `0` | Index si non present dans l'URL |
| `BULLMQ_PREFIX` | `sj:{WORKTREE_ID}` | Isolation multi-worktree |
| `WORKER_MAX_ATTEMPTS` | `5` | Tentatives max par job |
| `WORKER_BACKOFF_DELAY_MS` | `1000` | Base backoff exponentiel |
| `WORKER_CONCURRENCY` | `2` | Concurrence file notifications |
| `NOTIFICATION_CHANNEL` | `whatsapp` | Canal DeliveryLog |
| `NOTIFICATION_PROVIDER` | (prod unconfigured) | `fake` pour local/tests |
| `WHATSAPP_PROVIDER_TOKEN` | vide | Production : sans token = non configure |
| `WORKER_AUTOSTART` | on | `0` pour importer le module sans boot |
| `WORKER_QUIET_SHUTDOWN` | off | `1` : pas de `process.exit` |

## Files BullMQ

| Queue | Job name | Effet |
|---|---|---|
| `notification-delivery` | `deliver` | Provider send + DeliveryLog |
| `round-deadline-close` | `scan` | Claim deadline → VERIFICATION |
| `payment-reconciliation` | `reconcile` | EXPIRED sur PENDING stales |

Enqueue programmatique :

```ts
import {
  createWorkerRunner,
  enqueueNotificationDelivery,
  enqueueRoundDeadlineScan,
  enqueuePaymentReconciliation,
} from "@session-jeu/worker";

const runner = createWorkerRunner({ provider: fake });
await runner.start();
await enqueueNotificationDelivery(runner.queues.notification, notificationJobId);
await runner.stop();
```

## Arret propre

`SIGINT` / `SIGTERM` → `worker.close()` (drain) puis `queue.close()`.
Les jobs actifs se terminent ; les suivants ne sont plus pris.

## Idempotence

- Notification : `jobId` Redis `notif-{notificationJobId}` (pas de `:` — contrainte BullMQ) + skip si status `SENT`/`FAILED`.
- Deadline : `claimDueRoundDeadline` (updateMany count=1).
- Reconciliation : re-fetch `findTransactionById`, n'expire que si encore `PENDING`.

## Observabilite

- Logs JSON : `correlationId`, `jobName`, `jobId`, `attempt` — secrets/phones redactes via gateway.
- Metriques process : `getMetrics()` → `{ success, retry, failure, skipped }`.

## Provider

- Tests / local : `NOTIFICATION_PROVIDER=fake` ou injection `FakeNotificationProvider`.
- Production : `createProductionProviderFromEnv()` — **explicitement non configure** sans token ; meme avec token, pas de SDK branche (fail-closed `PROVIDER_SDK_NOT_WIRED`).

## Validations scope

```bash
scripts/worktree-run pnpm --filter @session-jeu/worker typecheck
scripts/worktree-run pnpm --filter @session-jeu/worker lint
scripts/worktree-run pnpm --filter @session-jeu/worker test
scripts/worktree-run pnpm --filter @session-jeu/worker build
scripts/worktree-run pnpm --filter @session-jeu/whatsapp-gateway test
```

L3 (necessite infra worktree) :

```bash
scripts/worktree-run pnpm infra:up:migrate
# Forcer les tests L3 BullMQ+PG (sinon skip si WORKER_L3 absent)
scripts/worktree-run env WORKER_L3=1 NODE_ENV=test WORKER_AUTOSTART=0 \
  pnpm --filter @session-jeu/worker test
```

Si `DATABASE_URL` pointe vers un port Docker inactif alors que l'infra locale
tourne sur 5432/6379, surcharger les URLs pour la session de test.
