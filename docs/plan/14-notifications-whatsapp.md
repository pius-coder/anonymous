# Feature 14 - Plan Scrum - Notifications et WhatsApp

## Objectif sprint

Informer les joueurs et communautes sans rendre WhatsApp critique pour le fonctionnement de la plateforme.

## Dependances

- Feature 01 liens partageables.
- Feature 05/06/08/12 events produit.

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

- Notifications critiques visibles web app.
- Rappels deduplices.
- WhatsApp optionnel.
- Aucun blocage coeur produit par WhatsApp.

