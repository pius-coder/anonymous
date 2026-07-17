# P-A-NOTIFICATIONS - Outbox et provider reel

## Mission autonome

Livrer les notifications transactionnelles et operatoires via un provider reel choisi, avec outbox,
templates versionnes, consentement, retries, DLQ et observabilite.

## Prerequis et lectures

- P-SEQ-00/02/03 merges; decision provider push/WhatsApp fermee avant code provider.
- Lire notifications, privacy, worker, gateway, reset/preparation et audit production.
- Context7 : BullMQ et SDK officiel du provider choisi; documentation officielle du provider.

## Ownership

Use-cases Notification, outbox producer, `apps/worker/src/jobs/notification*`, gateway/provider,
templates, `/me/notifications` et tests. Le runner central appartient a P-SEQ-04. Aucun job de paiement
ou deadline, aucune logique de partie ni demarrage de round.

## Interdit

Contracts/DB, provider qui retourne toujours fail, token reset durable en clair, job DB jamais enqueue,
claim non atomique, PII/secret dans log, succes retourne quand le job doit retry.

## Livrables production

- outbox creee dans la transaction metier puis publiee idempotemment vers BullMQ;
- provider sandbox/live, timeout, rate limit, idempotence et mapping erreurs;
- templates/version/langue/consentement et canal de repli explicitement decide;
- claims atomiques, retries/backoff, stalled recovery, DLQ/replay controle et delivery log;
- scheduler de delivery/outbox uniquement; les deadlines et reconciliations appartiennent a Realtime
  et Finance;
- metriques queue/age/retry/failure, alertes et runbooks provider/secret.

## Criteres d'acceptation

- reset et annonce atteignent un vrai terminal/canal de test sans secret persiste;
- crash avant/apres envoi ne produit pas de doublon non detecte;
- erreur transitoire retry, erreur permanente DLQ, aucune erreur n'est marquee succes;
- opt-out/consentement et RBAC support sont appliques;
- Redis utilise une politique compatible BullMQ et graceful shutdown attend les jobs.

## Tests et sortie

L3 PostgreSQL+Redis+BullMQ, L4 provider sandbox contract, L5 reset/annonce/inbox, injection panne/replay.
Gates lot, preuve de livraison redigee, commit atomique et runbook.
