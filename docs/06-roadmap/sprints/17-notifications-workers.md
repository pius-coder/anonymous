# Sprint 17 - Notifications et workers

## Objectif

Refaire annonces, rappels, delivery status et jobs idempotents. Hors scope: choisir un provider externe sans
decision.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-17-01 | Admin | En tant qu'admin, je veux envoyer une annonce et voir son statut de livraison, afin de savoir qui a ete informe. | Communication traçable. | Must |
| US-17-02 | Joueur | En tant que joueur, je veux recevoir des rappels comprehensibles, afin de ne pas rater la preparation. | Rappel utile. | Must |
| US-17-03 | Support | En tant que support, je veux diagnostiquer un echec de livraison, afin d'aider sans voir les secrets provider. | Diagnostic notification. | Should |
| US-17-04 | Worker/Systeme | En tant que systeme, je veux relancer les jobs sans doublon, afin d'assurer la livraison et la reconciliation. | Jobs idempotents. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-17-01 | US-17-01 | Zone annonces admin | Preparation ouverte | L'admin clique `Envoyer l'annonce` | Job cree, statut `PENDING` visible | [sequences](../../03-architecture/uml/sequences.md) | `CreateNotificationJob` |
| AC-17-02 | US-17-01 | Statut livraison | Provider confirme | L'admin clique `Rafraichir statuts` | Delivery log `SENT` visible | [data flow](../../03-architecture/uml/data-flow.md) | `NotificationDeliveryUpdated` |
| AC-17-03 | US-17-02 | Notifications joueur | Rappel preparation envoye | Le joueur clique `Voir notification` | Message clair, lien vers lobby | [state machines](../../03-architecture/uml/state-machines.md) | UI notification test |
| AC-17-04 | US-17-03 | Support delivery | Echec provider | Le support clique `Voir erreur livraison` | Erreur lisible sans token/provider secret | [permissions](../../03-architecture/uml/permissions.md) | Redaction test |
| AC-17-05 | US-17-04 | Worker retry | Job deja traite | Le systeme relance `Retry notification` | Aucun doublon envoye | [data flow](../../03-architecture/uml/data-flow.md) | Idempotence test |
| AC-17-06 | US-17-04 | Scheduler | Heure de rappel atteinte | Le systeme declenche `Rappel preparation` | Notification envoyee, partie non demarree | [state machines](../../03-architecture/uml/state-machines.md) | No auto start |

## Sources Docs Obligatoires

- Produit: [notifications](../../01-product/notifications.md), [use cases](../../01-product/use-cases.md)
- UX: [announcements](../../02-ux/announcements.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [data flow](../../03-architecture/uml/data-flow.md), [sequences](../../03-architecture/uml/sequences.md), [permissions](../../03-architecture/uml/permissions.md)
- Couches: [notifications](../../04-layers/notifications.md), [observability](../../04-layers/observability.md), [application use cases](../../04-layers/application-use-cases.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `NotificationJob`, `DeliveryLog`, `OutboundMessage` existaient.
- Worker gerait check-in deadline, expiration, payment reconciliation, credits, notifications et round deadline.
- WhatsApp gateway existait mais le provider final reste ouvert.

## UML Concernee

- Lire [data flow](../../03-architecture/uml/data-flow.md) et [sequences](../../03-architecture/uml/sequences.md).
- Modifier si un job change une transition metier.

## Pipeline Par Couche

- Web: affichage notifications et delivery status lisible.
- API/ConnectRPC: commands/queries notifications, enqueue via use case.
- Game-server: aucun envoi provider direct.
- Domaine: regles d'annonce/rappel.
- DB: `NotificationJob`, `DeliveryLog`, idempotency.
- Worker: retry, backoff, reconciliation, deadline jobs.
- Notifications: providers via ports.
- Observabilite: metrics queue, retries, failure reason, redaction.

## Contrats Protobuf Et ConnectRPC

`SendAnnouncement`, `CreateNotificationJob`, `NotificationDeliveryUpdated`, `ListMyNotifications`,
`AcknowledgeNotification`, erreurs `DELIVERY_FAILED`, `PROVIDER_UNAVAILABLE`.

## Data

Announcement -> notification job -> delivery log. Preferences/consentement si scope confirme.

## UI States

Notification unread/read, delivery pending/sent/failed, retrying, provider unavailable.

## Permissions

Admin annonce. Joueur lit ses notifications. Worker execute. Notification ne demarre pas une partie.

## Erreurs Observabilite

Retry provider, failure provider, duplicate enqueue, payload redaction, logs sans secrets.

## Tests Attendus

- Enqueue idempotent.
- Retry provider.
- Failure provider.
- Pas de demarrage partie par notification.
- Logs sans secrets.

## Definition Of Done

- Une notification ne demarre aucune partie et ne publie aucun score.
- Les statuts livraison sont comprehensibles par admin et joueur.

## Interdictions Specifiques

- Ne pas confondre rappel systeme et transition metier.
- Ne pas bloquer le sprint sur un provider externe non choisi.
