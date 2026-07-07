# Feature 14 - Plan Scrum - Notifications et WhatsApp

## Objectif sprint

Informer les joueurs et communautes sans rendre WhatsApp critique pour le fonctionnement de la plateforme.

## Dependances

- Feature 01 liens partageables.
- Feature 05/06/08/12 events produit.

## Gate documentaire obligatoire

Avant implementation :

1. Lire la documentation officielle Meta WhatsApp Business Platform si la gateway est implementee.
2. Lire via Context7 BullMQ pour rappels retardes et deduplication.
3. Lire via Context7 Hono pour webhook WhatsApp.
4. Lire via Context7 Prisma pour logs de livraison et preferences.
5. Documenter opt-in, templates, limites et comportement en cas d echec avant de coder.

## User stories

### Story 14.1 - Notifications in-app

Etapes :

1. Creer `NotificationPreference`.
2. Creer `NotificationJob`.
3. Creer `DeliveryLog`.
4. Ajouter notifications inscription, paiement, check-in, resultats.
5. Afficher notifications dans web app.

Tests :

- Notification creee.
- Joueur voit ses notifications.
- Autre joueur refuse.

### Story 14.2 - Rappels planifies

Etapes :

1. Creer jobs BullMQ rappels check-in/start.
2. Utiliser `jobId` unique.
3. Annuler rappel si session annulee.
4. Reessayer en cas d echec.

Tests :

- Rappel envoye.
- Doublon evite.
- Session annulee pas de rappel.

### Story 14.3 - Liens de partage admin

Etapes :

1. Creer `POST /v1/admin/notifications/session/:id/share`.
2. Generer message partageable.
3. Ne pas inclure donnees privees.
4. Journaliser partage.

Tests :

- Message cree.
- Session private ne fuite pas.
- Player refuse.

### Story 14.4 - Gateway WhatsApp optionnelle

Etapes :

1. Creer service placeholder ou gateway.
2. Creer `POST /v1/webhooks/whatsapp`.
3. Gerer opt-in.
4. Gerer templates.
5. S assurer qu un echec WhatsApp ne bloque rien.

Tests :

- Opt-in requis.
- Gateway down non bloquante.
- Webhook valide.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires template/message safe.
  - Tests integration preferences et notifications in-app.
  - Tests BullMQ rappels deduplices.
  - Tests opt-in requis pour WhatsApp non transactionnel.
  - Tests gateway down non bloquante.
  - Test privacy : pas de donnees privees dans message partage.
- Notifications critiques visibles web app.
- Rappels deduplices.
- WhatsApp optionnel.
- Aucun blocage coeur produit par WhatsApp.
