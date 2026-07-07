# Feature 05 - Plan Scrum - Inscription joueur a une session

## Objectif sprint

Permettre a un joueur connecte de s inscrire a une session sans double inscription ni depassement de capacite.

## Dependances

- Feature 02 auth.
- Feature 04 sessions publiees.

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

- Inscription concurrente fiable.
- Aucun depassement capacite.
- Aucune double inscription active.
- Expiration testee.

