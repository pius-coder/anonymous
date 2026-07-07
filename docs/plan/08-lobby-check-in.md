# Feature 08 - Plan Scrum - Lobby, check-in et preparation

## Objectif sprint

Rassembler les joueurs payes, verifier leur presence et generer l entree vers la room live.

## Dependances

- Feature 05 inscription.
- Feature 06/07 paiement valide.
- Redis disponible.

## User stories

### Story 8.1 - Lobby joueur

Etapes :

1. Creer `GET /v1/sessions/:id/lobby`.
2. Autoriser seulement `PAID`.
3. Retourner regles critiques, horaires, compte a rebours, policy no-show.
4. Brancher presence courte Redis si necessaire.

Tests :

- PAID accede.
- Non paid refuse.
- Session annulee refuse.

### Story 8.2 - Check-in

Etapes :

1. Creer `POST /v1/sessions/:id/check-in`.
2. Verifier deadline.
3. Passer registration `CHECKED_IN`.
4. Ecrire event `player.checked-in`.
5. Rendre operation idempotente.

Tests :

- Check-in OK.
- Recheck idempotent.
- Deadline passee refuse.

### Story 8.3 - Start policy

Etapes :

1. Definir policy : minimum joueurs PAID ou CHECKED_IN.
2. Creer `POST /v1/admin/sessions/:id/start`.
3. Verifier minPlayers.
4. Marquer session `WAITING_START` ou `LIVE`.
5. Planifier/emettre event vers game-server.

Tests :

- Min atteint OK.
- Min non atteint refuse ou annule selon policy.
- Admin action auditee.

### Story 8.4 - Join token

Etapes :

1. Creer `GET /v1/sessions/:id/join-token`.
2. Generer token court et single-use.
3. Lier token a registration.
4. Consommer token cote game-server.

Tests :

- Token valide.
- Token expire.
- Token reutilise refuse.

## Definition of Done

- Lobby accessible aux PAID.
- Check-in fiable.
- Start policy testee.
- Join token pret pour Colyseus.

