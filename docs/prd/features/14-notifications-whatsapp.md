# Feature 14 - Notifications et diffusion communautaire WhatsApp

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Informer et rappeler les joueurs sans rendre WhatsApp critique pour paiement, lobby ou live.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Supporter acquisition, retention, rappels et partage communautaire par canaux web/in-app et WhatsApp optionnel. |
| Target users | joueurs, communautes WhatsApp, admins marketing, support |
| Business value | Moyenne a elevee: utile pour acquisition et retention, non critique au gameplay V1. |
| Technical complexity | Moyenne: liens partageables et notifications internes simples; WhatsApp gateway ajoute opt-in, templates et webhooks. |
| Risk level | Moyen: spam, dependance WhatsApp, message au mauvais moment, confidentialite, consentement absent. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Liens partageables manuels V1.
- Notifications in-app critiques.
- Rappels programmes via worker.
- Gateway WhatsApp optionnelle/separee.
- Preferences et consentement communication.

## Parcours et workflows

1. Session publiee: admin genere lien partageable.
2. Registration/payment/check-in/result event enqueue notification.
3. Worker envoie rappel avant check-in/start avec jobId unique.
4. WhatsApp webhook optionnel met a jour DeliveryLog; echec n impacte pas coeur produit.

## Logiques metier et invariants

- V1 peut commencer par liens partageables manuels.
- Notifications critiques aussi visibles dans web app.
- WhatsApp gateway optionnel et separable.
- Messages sortants respectent opt-in, templates et limites.
- Rappels programmes via worker.
- Echec WhatsApp ne bloque pas paiement/lobby/live.

## Donnees principales

- `NotificationPreference`
- `MessageTemplate`
- `NotificationJob`
- `DeliveryLog`
- `ConsentRecord`
- `OutboundMessage`

## API et contrats

- `POST /v1/admin/notifications/session/:id/share`
- `POST /v1/webhooks/whatsapp`
- `GET /v1/me/notification-preferences`
- `PATCH /v1/me/notification-preferences`
- `POST /internal/notifications/send`

Erreurs et cas limites a normaliser :

- `403_OPT_IN_REQUIRED`
- `409_DUPLICATE_NOTIFICATION`
- `422_TEMPLATE_NOT_APPROVED`
- `502_WHATSAPP_UNAVAILABLE`

## Evenements et jobs

- `notification.queued`
- `notification.sent`
- `notification.failed`
- `whatsapp.webhook-received`
- `share.link-created`

## Securite, conformite et audit

- Opt-in required for non-transactional outbound messages.
- Do not leak private results to groups.
- Templates reviewed before use.
- Deduplicate reminders with jobId.
- WhatsApp credentials isolated in gateway.

## Criteres d acceptation

- Rappels critiques visibles in-app.
- Opt-in/out respected.
- Duplicate reminder prevented.
- WhatsApp failure non-blocking.
- Webhook signature/validation if implemented.
- No private data in share preview.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `notification_send_rate`
- `delivery_failure_rate`
- `duplicate_message_prevented`
- `time_to_reminder_before_start`
- `share_link_created_count`

## Dependances fonctionnelles

- Feature 01 share links
- Feature 05 registration
- Feature 06 payment status
- Feature 08 check-in
- Feature 12 results

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md apps/whatsapp-gateway optionnel
- deep-research-report.md WhatsApp not critical
- BullMQ delayed jobs/jobId
- Meta WhatsApp Business Platform

References officielles techniques :

- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Meta WhatsApp Business Platform / Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt

## Questions ouvertes

- WhatsApp automatise en V1 ou liens manuels seulement.
- Canaux alternatifs: email/SMS/in-app.
- Opt-in wording et consentement.
- Couts et limites WhatsApp.
