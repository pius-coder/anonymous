# apps/worker

## Objectif

Executer les traitements asynchrones et planifies qui ne doivent pas bloquer les APIs ou le temps reel.
Runner BullMQ operationnel pour :

- livraison de notifications (`NotificationJob` → provider → `DeliveryLog`) ;
- cloture de deadline de manche (claim atomique) ;
- reconciliation des paiements PENDING expires.

## Perimetre

- Jobs BullMQ (Queue + Worker) avec demarrage et arret propre.
- Claim atomique des effets (jobId BullMQ + claim DB deadline + re-fetch reconciliation + skip SENT/FAILED).
- Retry / backoff exponentiel / max attempts explicites (`WORKER_MAX_ATTEMPTS`, `WORKER_BACKOFF_DELAY_MS`).
- Logs structures redactes, `correlationId`, metriques succes/retry/echec/skipped.
- Provider injecte (fake contractuel ou production non configuree).

## Hors perimetre

- Demarrage automatique d'une partie active.
- Publication de scores.
- Decisions d'arbitrage humain.
- UI ou handlers HTTP publics.
- Schema Prisma / migrations / seed (SEQ-02).
- Use-cases preparation / payment API / round API.

## Dependances autorisees

- `@session-jeu/db` — APIs publiques repository figees SEQ-02.
- `@session-jeu/whatsapp-gateway` — port `NotificationProvider` + redaction.
- `bullmq` / `ioredis` — queue Redis.

## Dependances interdites

- Imports profonds hors API publique packages.
- Acces aux composants web / game-server.
- SDK provider non valide comme defaut silencieux.

## API publique du module

| Export | Role |
|---|---|
| `createWorkerRunner` | Demarre queues + workers, `stop()` ferme proprement |
| `enqueueNotificationDelivery` | Enfile un job avec `jobId=notif:{id}` |
| `enqueueRoundDeadlineScan` | Enfile un scan deadline |
| `enqueuePaymentReconciliation` | Enfile une reconciliation |
| `deliverNotificationJob` | Logique pure de livraison (testable sans Redis) |
| `closeDueRoundDeadlines` | Cloture VERIFICATION via claim |
| `reconcilePendingTransactions` | Expire PENDING stales idempotemment |
| `loadWorkerConfig` / `QUEUE_NAMES` / `getMetrics` | Config et observabilite |

## Statuts NotificationJob

`PENDING` → `PROCESSING` → `SENT` | `FAILED`

Terminal : re-enqueue / retry ne renvoie pas au provider.

## Procedure d'extension

1. Documenter le job, declencheur, idempotence.
2. Definir payload et resultat.
3. Verifier BullMQ via Context7 (`/taskforcesh/bullmq`).
4. Ajouter tests unitaires + L3 si effet persistant.
5. Mettre a jour `RUNBOOK.md`.

## Tests

- Unitaires : livraison, retry, final FAILED, deadline claim skip, reconciliation re-fetch, redaction.
- L3 (`REDIS_URL` + `DATABASE_URL`) : delivery fake, retry, shutdown, claim concurrent, idempotence send.
