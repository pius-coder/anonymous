# Feature 06 - Paiement Fapshi et validation transactionnelle

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Collecter les paiements via Fapshi, recevoir les webhooks, verifier les statuts et marquer les inscriptions payees de facon idempotente.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Transformer une intention d inscription en paiement confirme, verifie, auditable et reconciliable. |
| Target users | joueurs, support, finance |
| Business value | Critique: sans paiement fiable, pas de revenu, pas de confiance et pas de session valide. |
| Technical complexity | Elevee: webhooks, secrets, idempotence, reconciliation, sandbox/live, limites polling et transactions DB. |
| Risk level | Tres eleve: faux positif paiement, double confirmation, webhook replay, paiement non associe, expiration ou contradiction provider. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Initiation Fapshi hosted checkout.
- Stockage providerTransId/externalId.
- Webhook-first avec verification x-wh-secret.
- Idempotence payment -> registration PAID -> ledger si applicable.
- Reconciliation worker pour webhook manque.

## Parcours et workflows

1. API cree Payment PENDING et appelle Fapshi initiate-pay.
2. Fapshi retourne link et transId; API les persiste et renvoie checkoutUrl.
3. Webhook Fapshi arrive: verifier x-wh-secret, dedupliquer evenement, traiter transition en transaction courte.
4. Worker reconcile verifie les paiements ambigus en respectant les limites provider.

## Logiques metier et invariants

- L API cree la transaction Fapshi, pas Colyseus.
- Fapshi retourne link et transId pour paiement hosted checkout.
- Webhook source principale de changement de statut.
- Webhook verifie par x-wh-secret.
- Traitement webhook idempotent.
- Polling uniquement en secours/reconciliation avec rate limit.
- Montants stockes en entiers XAF.

## Donnees principales

- `PaymentTransaction`
- `FapshiTransaction`
- `WebhookEvent`
- `SessionRegistration`
- `AuditLog`
- `IdempotencyKey`

## API et contrats

- `POST /v1/payments/fapshi/initiate`
- `POST /v1/webhooks/fapshi`
- `GET /v1/payments/:id/status`
- `POST /v1/admin/payments/:id/reconcile`

Erreurs et cas limites a normaliser :

- `401_INVALID_WEBHOOK_SECRET`
- `409_PAYMENT_ALREADY_PROCESSED`
- `404_PAYMENT_NOT_FOUND`
- `409_REGISTRATION_EXPIRED`
- `502_PROVIDER_UNAVAILABLE`

## Evenements et jobs

- `payment.initiated`
- `payment.webhook-received`
- `payment.successful`
- `payment.failed`
- `payment.expired`
- `payment.reconciled`

## Securite, conformite et audit

- Secrets Fapshi en infrastructure, jamais client.
- Verification x-wh-secret pour webhook.
- providerTransId unique et idempotent.
- Reponse webhook rapide 200 apres validation minimale.
- Audit des reconciliations manuelles.
- Aucun paiement decide par game-server.

## Criteres d acceptation

- Webhook sans x-wh-secret valide rejete.
- Webhook repete ne double pas paiement, registration PAID ou ledger.
- Paiement confirme marque inscription PAID dans la meme transaction logique.
- Webhook pour payment inconnu ou tardif applique politique.
- Polling respecte limites provider.
- Sandbox/live credentials separes.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `payment_initiated_count`
- `payment_success_rate`
- `webhook_signature_failures`
- `webhook_delay_seconds`
- `payment_reconciliation_count`
- `payment_duplicate_prevented_count`

## Dependances fonctionnelles

- Feature 05 inscription
- Feature 07 wallet/ledger
- Feature 13 admin finance
- Feature 15 security

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- Fapshi initiate-pay/webhook/payment-status
- PRD_PHASE_1.md recherche Fapshi
- deep-research-report.md sequence paiement
- Hono webhook route
- Prisma/PostgreSQL idempotence
- BullMQ reconciliation

References officielles techniques :

- Fapshi initiate-pay, payment status, webhook, sandbox/live and x-wh-secret: https://docs.fapshi.com/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Hosted checkout uniquement ou direct-pay aussi.
- Politique paiement reussi mais session pleine/annulee.
- Validation manuelle: roles, preuves, delais et audit.
