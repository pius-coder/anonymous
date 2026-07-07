# Feature 06 - Plan Scrum - Paiement Fapshi

## Objectif sprint

Transformer une inscription pending en inscription payee via Fapshi avec webhook securise, idempotence et reconciliation.

## Dependances

- Feature 05 inscriptions.
- Variables Fapshi sandbox disponibles.

## User stories

### Story 6.1 - Schema paiement

Etapes :

1. Finaliser `PaymentTransaction`.
2. Ajouter `provider`, `externalId`, `providerTransId`, `status`, `amountXaf`.
3. Ajouter `WebhookEvent`.
4. Ajouter contraintes uniques `externalId` et `providerTransId`.

Tests :

- Unicite transId.
- Status transitions.

### Story 6.2 - Initiation paiement

Etapes :

1. Creer `POST /v1/payments/fapshi/initiate`.
2. Verifier registration pending.
3. Creer payment local `PENDING`.
4. Appeler Fapshi initiate-pay.
5. Persister `link` et `transId`.
6. Retourner checkoutUrl.

Tests :

- Initiation OK.
- Montant < minimum refuse.
- Provider down gere.
- Payment local rollback/compensation claire.

### Story 6.3 - Webhook Fapshi

Etapes :

1. Creer `POST /v1/webhooks/fapshi`.
2. Verifier header `x-wh-secret`.
3. Dedupliquer evenement.
4. Verrouiller par `providerTransId`.
5. Passer payment SUCCESS/FAILED/EXPIRED.
6. Passer registration PAID si SUCCESS.
7. Repondre vite 200.

Tests :

- Secret invalide refuse.
- Replay webhook idempotent.
- SUCCESS marque PAID.
- FAILED/EXPIRED ne marque pas PAID.

### Story 6.4 - Reconciliation

Etapes :

1. Creer job BullMQ `payment.reconcile`.
2. Poller provider uniquement en secours.
3. Respecter rate limits.
4. Ajouter endpoint admin `POST /v1/admin/payments/:id/reconcile`.
5. Auditer reconciliation manuelle.

Tests :

- Job idempotent.
- Polling limite.
- Admin non finance refuse.

## Definition of Done

- Paiement webhook-first.
- Webhook securise.
- Pas de double validation.
- Reconciliation disponible.

