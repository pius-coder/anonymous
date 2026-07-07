# Feature 09 - Plan Scrum - GameSession live temps reel

## Objectif sprint

Orchestrer une session live avec Colyseus : room, phases, timers, actions, reconnexion, pause/reprise.

## Dependances

- Feature 08 lobby/check-in.
- Colyseus configure.
- Redis et BullMQ disponibles.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 la documentation Colyseus actuelle avec une question precise sur setup serveur TypeScript, rooms, schema, transport, presence, matchmaking, clock et reconnection.
2. Verifier la version installee de `colyseus` et des packages `@colyseus/*` avant d ecrire les imports.
3. Confirmer depuis la doc actuelle les imports serveur. Verification Context7 du 2026-07-07 : la doc Colyseus `/colyseus/docs` montre `import { defineServer, defineRoom } from "colyseus"` pour configurer le serveur, `@colyseus/schema` pour `Schema`, `MapSchema`, `type`, et des transports comme `@colyseus/ws-transport` selon le setup.
4. Ne pas utiliser l ancienne classe `Server` ou des imports supposes sans confirmer qu ils correspondent exactement a la version installee.
5. Verifier peer dependencies, transport, RedisPresence/RedisDriver si multi-process, et contraintes TypeScript des decorators avant de coder.
6. Lire via Context7 BullMQ pour deadline recovery et Redis pour presence.
7. Documenter les exemples officiels lus et les decisions de version dans les notes de sprint.

## User stories

### Story 9.1 - Reservation live

Etapes :

1. Creer endpoint `POST /v1/live/sessions/:id/reservation`.
2. Verifier auth, registration CHECKED_IN, session startable.
3. Creer seat reservation Colyseus ou token bridging.
4. Retourner endpoint WS.

Tests :

- CHECKED_IN OK.
- Non checked-in refuse.
- Session non live refuse.

### Story 9.2 - Room Colyseus par session

Etapes :

1. Creer room `GameSessionRoom`.
2. Charger state initial depuis DB.
3. Definir phases : BRIEFING, ROUND_ACTIVE, RESOLVING, RESULTS, PAUSED.
4. Synchroniser uniquement donnees utiles au client.

Tests :

- Room creee.
- State minimal synchronise.
- Client ne peut pas creer room arbitraire.

### Story 9.3 - Timers et deadlines

Etapes :

1. Utiliser clock Colyseus pour timer ressenti.
2. Persister `RoundDeadline` en DB.
3. Planifier job BullMQ de fermeture.
4. Rejeter actions apres deadline.

Tests :

- Deadline DB existe.
- Late input refuse.
- Worker ferme round si room tombe.

### Story 9.4 - Reconnexion et pause admin

Etapes :

1. Implementer `allowReconnection`.
2. Restaurer etat joueur.
3. Creer `POST /v1/admin/live/:sessionId/pause`.
4. Creer `POST /v1/admin/live/:sessionId/resume`.
5. Auditer pause/reprise.

Tests :

- Reconnexion restaure state.
- Action deja soumise non replay.
- Pause/resume audite.

## Definition of Done

- Criteres de tests a valider :
  - Tests integration reservation live.
  - Tests Colyseus room creation avec version/imports confirmes par doc.
  - Tests state sync minimal sans donnees sensibles.
  - Tests deadline DB + timer room.
  - Tests late input refuse.
  - Tests reconnexion et non-replay action.
  - Test recovery : worker ferme round si room indisponible.
- Room live fonctionnelle.
- Timer officiel durable.
- Reconnexion testee.
- Crash/recovery minimal teste.
