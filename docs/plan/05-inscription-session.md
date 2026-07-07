# Feature 05 - Plan Scrum - Inscription joueur a une session

## Objectif sprint

Permettre a un joueur connecte de s inscrire a une session sans double inscription ni depassement de capacite.

## Dependances

- Feature 02 auth.
- Feature 04 sessions publiees.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour transactions interactives, OCC et gestion de contention.
2. Lire la documentation PostgreSQL sur isolation si la derniere place est protegee par transaction forte.
3. Lire via Context7 BullMQ pour jobs d expiration et `jobId` idempotent.
4. Lire via Context7 Hono pour validation, auth middleware et erreurs.
5. Documenter le choix technique de reservation capacite avant de coder.

## User stories

### Story 5.1 - Schema inscription

Etapes :

1. Finaliser `SessionRegistration`.
2. Ajouter status `CREATED`, `PAYMENT_PENDING`, `PAID`, `CANCELLED`, `REFUNDED`.
3. Ajouter `paymentDeadlineAt`.
4. Ajouter contrainte unique active user/session.
5. Ajouter indexes capacite.

Tests :

- Unique active registration.
- Status transitions valides.

### Story 5.2 - Register session

Etapes :

1. Creer `POST /v1/sessions/:id/register`.
2. Verifier auth.
3. Verifier session ouverte.
4. Verifier capacite en transaction.
5. Verifier absence inscription active.
6. Creer registration `PAYMENT_PENDING`.
7. Planifier expiration BullMQ.

Tests :

- Inscription OK.
- Session fermee refusee.
- Double inscription refusee.
- Derniere place concurrente protegee.

### Story 5.3 - Consultation et annulation

Etapes :

1. Creer `GET /v1/sessions/:id/registration`.
2. Creer `POST /v1/registrations/:id/cancel`.
3. Appliquer policy avant paiement.
4. Auditer annulation support/admin.

Tests :

- Joueur voit seulement sa registration.
- Annulation pending libere place.
- Annulation paid suit policy.

### Story 5.4 - Expiration reservation

Etapes :

1. Implementer job `registration.expire`.
2. Verifier status toujours pending.
3. Passer `EXPIRED` ou `CANCELLED` selon enum retenue.
4. Liberer capacite.
5. Publier event.

Tests :

- Job idempotent.
- Paiement arrive avant expiration conserve inscription.
- Job repete sans effet.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires transitions `SessionRegistrationStatus`.
  - Tests integration register, cancel, status.
  - Tests concurrence derniere place et double clic.
  - Tests idempotence expiration reservation.
  - Tests securite ownership registration.
  - Test E2E joueur : detail session -> inscription pending.
- Inscription concurrente fiable.
- Aucun depassement capacite.
- Aucune double inscription active.
- Expiration testee.
