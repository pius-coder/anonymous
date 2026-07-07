# Feature 08 - Plan Scrum - Lobby, check-in et preparation

## Objectif sprint

Rassembler les joueurs payes, verifier leur presence et generer l entree vers la room live.

## Dependances

- Feature 05 inscription.
- Feature 06/07 paiement valide.
- Redis disponible.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Redis pour presence courte, TTL et structures choisies.
2. Lire via Context7 BullMQ pour deadlines check-in et jobs retardes.
3. Lire via Context7 Colyseus pour seat reservation ou strategie d entree room si elle est utilisee.
4. Lire via Context7 Prisma pour persistance officielle `CHECKED_IN`.
5. Documenter ce qui est source de verite DB et ce qui est seulement presence volatile Redis avant de coder.

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

- Criteres de tests a valider :
  - Tests integration lobby accessible uniquement aux `PAID`.
  - Tests check-in idempotent.
  - Tests deadline/grace period.
  - Tests start policy minPlayers.
  - Tests join token expire et single-use.
  - Test E2E joueur : PAID -> lobby -> check-in -> join token.
- Lobby accessible aux PAID.
- Check-in fiable.
- Start policy testee.
- Join token pret pour Colyseus.
